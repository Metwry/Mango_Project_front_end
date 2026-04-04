import { computed, ref } from "vue";
import { defineStore } from "pinia";
import dayjs from "dayjs";
import api from "@/utils/api";
import { API_BASE_URL } from "@/config/Config";
import { useAuthStore } from "@/stores/auth";
import { ElMessage } from "@/utils/element";

const TEMP_SESSION_ID = "temp-new-session";

function formatUpdatedAt(value) {
  const target = dayjs(value);
  if (!target.isValid()) return "";
  const now = dayjs();
  const diffMinutes = now.diff(target, "minute");
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = now.diff(target, "hour");
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = now.startOf("day").diff(target.startOf("day"), "day");
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  return target.format("MM-DD");
}

function normalizeRole(role) {
  return String(role ?? "").toUpperCase() === "USER" ? "user" : "assistant";
}

function toPlainPreview(content) {
  const text = String(content ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[*_>#~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  if (text.length <= 56) return text;
  return `${text.slice(0, 56)}...`;
}

function mapMessages(messages = []) {
  return messages.map((item, index) => ({
    id: `${item.sequence ?? index}-${normalizeRole(item.role)}`,
    role: normalizeRole(item.role),
    content: item.content ?? "",
  }));
}

function mapSessionSummary(item) {
  return {
    id: item.id,
    title: item.title || "未命名对话",
    updatedAt: item.updated_at || "",
    updatedAtLabel: formatUpdatedAt(item.updated_at),
    preview: "",
    messages: [],
    detailLoaded: false,
    isTemporary: false,
  };
}

export const useAiStore = defineStore("ai", () => {
  const auth = useAuthStore();
  const conversations = ref([]);
  const activeConversationId = ref(null);
  const loading = ref(false);
  const ready = ref(false);
  const isThinking = ref(false);
  const fetched = ref(false);
  const fetchPromise = ref(null);
  const detailPromises = new Map();

  const activeConversation = computed(
    () => conversations.value.find((item) => item.id === activeConversationId.value) ?? null,
  );

  const activeSessionStorageKey = computed(() => {
    const userId =
      auth.user?.id ?? auth.user?.username ?? auth.user?.email ?? "anonymous";
    return `ai_active_session:${userId}`;
  });

  function getChatUrl() {
    const base = String(API_BASE_URL ?? "").replace(/\/+$/, "");
    return `${base}/ai/chat/`;
  }

  function getSessionUrl(sessionId) {
    return `/ai/chat/sessions/${sessionId}/`;
  }

  function readPersistedActiveSessionId() {
    const raw = localStorage.getItem(activeSessionStorageKey.value);
    if (!raw) return null;
    if (raw === TEMP_SESSION_ID) return TEMP_SESSION_ID;
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  function persistActiveSessionId(sessionId) {
    if (!sessionId) {
      localStorage.removeItem(activeSessionStorageKey.value);
      return;
    }
    localStorage.setItem(activeSessionStorageKey.value, String(sessionId));
  }

  function replaceConversation(nextConversation) {
    const index = conversations.value.findIndex((item) => item.id === nextConversation.id);
    if (index === -1) {
      conversations.value = [nextConversation, ...conversations.value];
      return nextConversation;
    }
    const nextList = [...conversations.value];
    nextList[index] = { ...nextList[index], ...nextConversation };
    conversations.value = nextList;
    return nextList[index];
  }

  function patchConversation(sessionId, patch = {}) {
    const index = conversations.value.findIndex((item) => item.id === sessionId);
    if (index === -1) return null;
    const nextList = [...conversations.value];
    nextList[index] = { ...nextList[index], ...patch };
    conversations.value = nextList;
    return nextList[index];
  }

  function moveConversationToTop(sessionId) {
    const index = conversations.value.findIndex((item) => item.id === sessionId);
    if (index <= 0) return;
    const nextList = [...conversations.value];
    const [target] = nextList.splice(index, 1);
    nextList.unshift(target);
    conversations.value = nextList;
  }

  function ensureTemporaryConversation() {
    const existing = conversations.value.find((item) => item.id === TEMP_SESSION_ID);
    if (existing) {
      activeConversationId.value = TEMP_SESSION_ID;
      persistActiveSessionId(TEMP_SESSION_ID);
      return existing;
    }

    const tempConversation = {
      id: TEMP_SESSION_ID,
      title: "新对话",
      updatedAt: "",
      updatedAtLabel: "",
      preview: "开始新的提问",
      messages: [],
      detailLoaded: true,
      isTemporary: true,
    };

    conversations.value = [tempConversation, ...conversations.value];
    activeConversationId.value = TEMP_SESSION_ID;
    persistActiveSessionId(TEMP_SESSION_ID);
    return tempConversation;
  }

  function mergeConversationDetail(payload) {
    return replaceConversation({
      id: payload.id,
      title: payload.title || "未命名对话",
      updatedAt: payload.updated_at || "",
      updatedAtLabel: formatUpdatedAt(payload.updated_at),
      preview: toPlainPreview(payload.messages?.at(-1)?.content ?? ""),
      messages: mapMessages(payload.messages),
      detailLoaded: true,
      isTemporary: false,
    });
  }

  async function fetchSessionDetail(sessionId) {
    if (!sessionId || sessionId === TEMP_SESSION_ID) return null;
    const current = conversations.value.find((item) => item.id === sessionId);
    if (current?.detailLoaded) return current;
    if (detailPromises.has(sessionId)) return detailPromises.get(sessionId);

    const promise = api
      .get(getSessionUrl(sessionId), { suppressErrorToast: true })
      .then(({ data }) => mergeConversationDetail(data))
      .catch(() => {
        const fallback = conversations.value.find((item) => item.id === sessionId);
        return patchConversation(sessionId, {
          detailLoaded: true,
          messages: fallback?.messages ?? [],
          preview: fallback?.preview ?? "",
        });
      })
      .finally(() => {
        detailPromises.delete(sessionId);
      });

    detailPromises.set(sessionId, promise);
    return promise;
  }

  async function fetchSessions({ force = false } = {}) {
    if (fetchPromise.value) return fetchPromise.value;
    if (fetched.value && !force) return conversations.value;

    loading.value = true;
    ready.value = false;

    const promise = (async () => {
      try {
        const { data } = await api.get("/ai/chat/sessions/", {
          suppressErrorToast: true,
        });

        conversations.value = Array.isArray(data) ? data.map(mapSessionSummary) : [];

        if (!conversations.value.length) {
          ensureTemporaryConversation();
          fetched.value = true;
          ready.value = true;
          return conversations.value;
        }

        const persistedSessionId = readPersistedActiveSessionId();
        const preferredSession =
          conversations.value.find((item) => item.id === persistedSessionId) ??
          conversations.value[0];

        activeConversationId.value = preferredSession.id;
        persistActiveSessionId(preferredSession.id);
        await Promise.all(conversations.value.map((item) => fetchSessionDetail(item.id)));

        fetched.value = true;
        ready.value = true;
        return conversations.value;
      } catch {
        conversations.value = [];
        ensureTemporaryConversation();
        fetched.value = true;
        ready.value = true;
        return conversations.value;
      } finally {
        loading.value = false;
        fetchPromise.value = null;
      }
    })();

    fetchPromise.value = promise;
    return promise;
  }

  async function selectConversation(sessionId) {
    activeConversationId.value = sessionId;
    persistActiveSessionId(sessionId);
    await fetchSessionDetail(sessionId);
  }

  function createConversation() {
    ensureTemporaryConversation();
  }

  function applySessionStart(sessionId, title) {
    if (activeConversationId.value === TEMP_SESSION_ID) {
      const tempConversation = conversations.value.find(
        (item) => item.id === TEMP_SESSION_ID,
      );
      conversations.value = conversations.value.filter((item) => item.id !== TEMP_SESSION_ID);
      replaceConversation({
        id: sessionId,
        title,
        updatedAt: new Date().toISOString(),
        updatedAtLabel: "刚刚",
        preview: tempConversation?.preview || "",
        messages: tempConversation?.messages || [],
        detailLoaded: true,
        isTemporary: false,
      });
    } else {
      patchConversation(sessionId, {
        title,
        detailLoaded: true,
        isTemporary: false,
      });
    }

    activeConversationId.value = sessionId;
    persistActiveSessionId(sessionId);
  }

  function updateStreamingMessage(sessionId, content, title) {
    patchConversation(sessionId, {
      title,
      preview: toPlainPreview(content),
      updatedAt: new Date().toISOString(),
      updatedAtLabel: "刚刚",
      detailLoaded: true,
    });

    const current = conversations.value.find((item) => item.id === sessionId);
    if (!current) return;

    const messages = [...current.messages];
    const lastMessage = messages.at(-1);
    if (lastMessage?.id === "streaming-assistant" && lastMessage.role === "assistant") {
      lastMessage.content = content;
    } else {
      messages.push({ id: "streaming-assistant", role: "assistant", content });
    }

    patchConversation(sessionId, { messages });
    moveConversationToTop(sessionId);
  }

  async function finalizeSession(sessionId) {
    if (!sessionId) return;
    await fetchSessionDetail(sessionId);
    moveConversationToTop(sessionId);
  }

  function parseSseData(eventName, dataText) {
    if (eventName === "delta") return dataText;
    try {
      return JSON.parse(dataText || "{}");
    } catch {
      return {};
    }
  }

  async function consumeSseStream(stream, handlers) {
    const reader = stream.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const lines = block.split("\n").map((line) => line.trimEnd());
        let eventName = "";
        const dataLines = [];

        for (const line of lines) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }

        if (!eventName) continue;
        await handlers(eventName, parseSseData(eventName, dataLines.join("\n")));
      }

      if (done) break;
    }
  }

  async function sendMessage(query) {
    const content = String(query ?? "").trim();
    if (!content || isThinking.value) return;

    const target = activeConversation.value ?? ensureTemporaryConversation();
    const requestSessionId = target.id === TEMP_SESSION_ID ? null : Number(target.id);
    const title =
      target.isTemporary || target.title === "新对话" ? content.slice(0, 30) : target.title;

    patchConversation(target.id, {
      title,
      preview: toPlainPreview(content),
      updatedAt: new Date().toISOString(),
      updatedAtLabel: "刚刚",
      detailLoaded: true,
      messages: [...target.messages, { id: `user-${Date.now()}`, role: "user", content }],
    });
    moveConversationToTop(target.id);

    isThinking.value = true;
    let resolvedSessionId = requestSessionId;
    let assistantContent = "";

    try {
      const headers = { "Content-Type": "application/json" };
      if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

      const response = await fetch(getChatUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(
          requestSessionId ? { query: content, session_id: requestSessionId } : { query: content },
        ),
      });

      if (!response.ok || !response.body) throw new Error("AI 对话请求失败");

      await consumeSseStream(response.body, async (eventName, payload) => {
        if (eventName === "start") {
          resolvedSessionId = Number(payload?.session_id ?? requestSessionId);
          if (resolvedSessionId) applySessionStart(resolvedSessionId, title || "新对话");
          return;
        }

        if (eventName === "delta") {
          assistantContent += String(payload ?? "");
          updateStreamingMessage(resolvedSessionId ?? target.id, assistantContent, title || "新对话");
          return;
        }

        if (eventName === "error") {
          const message =
            String(payload?.message ?? "").trim() || "当前请求处理失败，请稍后重试。";
          assistantContent = message;
          updateStreamingMessage(resolvedSessionId ?? target.id, assistantContent, title || "新对话");
          throw new Error(message);
        }

        if (eventName === "done") {
          resolvedSessionId = Number(payload?.session_id ?? resolvedSessionId);
        }
      });

      await finalizeSession(resolvedSessionId ?? target.id);
    } catch (error) {
      const message = String(error?.message ?? "").trim() || "发送失败，请稍后重试";
      if (!assistantContent) {
        updateStreamingMessage(resolvedSessionId ?? target.id, message, title || "新对话");
      }
      ElMessage.error(message);
    } finally {
      isThinking.value = false;
    }
  }

  async function renameConversation(title) {
    const current = activeConversation.value;
    const nextTitle = String(title ?? "").trim();
    if (!current || current.id === TEMP_SESSION_ID || !nextTitle) return;

    const { data } = await api.patch(getSessionUrl(current.id), { title: nextTitle });
    patchConversation(current.id, {
      title: data?.title || nextTitle,
      updatedAt: data?.updated_at || current.updatedAt,
      updatedAtLabel: formatUpdatedAt(data?.updated_at || current.updatedAt),
    });
  }

  async function deleteActiveConversation() {
    const current = activeConversation.value;
    if (!current) return;

    if (current.id !== TEMP_SESSION_ID) {
      await api.delete(getSessionUrl(current.id));
    }

    const nextConversations = conversations.value.filter((item) => item.id !== current.id);
    conversations.value = nextConversations;

    if (!nextConversations.length) {
      ensureTemporaryConversation();
      return;
    }

    activeConversationId.value = nextConversations[0].id;
    persistActiveSessionId(nextConversations[0].id);
  }

  function reset() {
    conversations.value = [];
    activeConversationId.value = null;
    loading.value = false;
    ready.value = false;
    isThinking.value = false;
    fetched.value = false;
    fetchPromise.value = null;
    detailPromises.clear();
  }

  return {
    conversations,
    activeConversationId,
    activeConversation,
    loading,
    ready,
    isThinking,
    fetched,
    fetchSessions,
    selectConversation,
    createConversation,
    sendMessage,
    renameConversation,
    deleteActiveConversation,
    reset,
  };
});
