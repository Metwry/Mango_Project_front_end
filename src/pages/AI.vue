<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import { useAiStore } from "@/stores/ai";
import { ElMessage, ElMessageBox } from "@/utils/element";

const promptSuggestions = [
  "帮我分析一下本月支出结构",
  "根据当前持仓给我一个风险提示",
  "整理一份今天适合关注的市场重点",
];

const aiStore = useAiStore();
const route = useRoute();
const { conversations, activeConversation, activeConversationId, loading, ready, isThinking } =
  storeToRefs(aiStore);

const keyword = ref("");
const draft = ref("");
const messageScrollRef = ref(null);
const conversationTransitionName = ref("page-slide-up");
const renameModalOpen = ref(false);
const renameDraft = ref("");
const renaming = ref(false);
const mobileSessionMenuOpen = ref(false);
let scrollFrameId = 0;
let scrollTimeoutId = 0;

const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false,
});

const filteredConversations = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  if (!value) return conversations.value;

  return conversations.value.filter((item) => {
    return (
      String(item.title ?? "").toLowerCase().includes(value) ||
      String(item.preview ?? "").toLowerCase().includes(value)
    );
  });
});

function renderMarkdown(content) {
  return DOMPurify.sanitize(markdown.render(String(content ?? "")));
}

async function scrollMessagesToBottom() {
  await nextTick();
  const element = messageScrollRef.value;
  if (!element) return;
  if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
  scrollFrameId = requestAnimationFrame(() => {
    element.scrollTop = element.scrollHeight;
    scrollFrameId = 0;
  });
}

async function ensureMessagesAtBottom() {
  await scrollMessagesToBottom();

  requestAnimationFrame(() => {
    void scrollMessagesToBottom();
  });

  if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
  scrollTimeoutId = window.setTimeout(() => {
    void scrollMessagesToBottom();
    scrollTimeoutId = 0;
  }, 80);
}

watch(
  () => [activeConversationId.value, activeConversation.value?.messages?.length ?? 0, ready.value],
  async ([, , isReady]) => {
    if (!isReady) return;
    await ensureMessagesAtBottom();
  },
  { flush: "post" },
);

watch(
  () => route.path,
  async (path) => {
    if (path !== "/ai" || !ready.value) return;
    await ensureMessagesAtBottom();
  },
  { flush: "post" },
);

watch(
  () => activeConversationId.value,
  (newId, oldId) => {
    if (!newId || !oldId || newId === oldId) return;

    const getIndex = (id) => conversations.value.findIndex((item) => item.id === id);
    const oldIndex = getIndex(oldId);
    const newIndex = getIndex(newId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    conversationTransitionName.value = newIndex > oldIndex ? "page-slide-up" : "page-slide-down";
  },
);

async function handleSelectConversation(id) {
  await aiStore.selectConversation(id);
  mobileSessionMenuOpen.value = false;
}

function handleCreateConversation() {
  aiStore.createConversation();
  mobileSessionMenuOpen.value = false;
}

async function handleSendMessage() {
  const content = draft.value.trim();
  if (!content) return;
  draft.value = "";
  await aiStore.sendMessage(content);
}

function handleSuggestion(text) {
  draft.value = text;
  void handleSendMessage();
}

function handleComposerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  void handleSendMessage();
}

function toggleMobileSessionMenu() {
  mobileSessionMenuOpen.value = !mobileSessionMenuOpen.value;
}

async function handleRenameConversation() {
  const current = activeConversation.value;
  if (!current || current.isTemporary) return;
  renameDraft.value = current.title;
  renameModalOpen.value = true;
}

function closeRenameModal() {
  if (renaming.value) return;
  renameModalOpen.value = false;
  renameDraft.value = "";
}

async function submitRenameConversation() {
  const title = renameDraft.value.trim();
  if (!title) {
    ElMessage.warning("名称不能为空");
    return;
  }

  renaming.value = true;
  try {
    await aiStore.renameConversation(title);
    ElMessage.success("重命名成功");
    closeRenameModal();
  } finally {
    renaming.value = false;
  }
}

async function handleDeleteConversation() {
  try {
    await ElMessageBox.confirm("确定删除当前对话？删除后无法恢复。", "提示", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  await aiStore.deleteActiveConversation();
}

onMounted(() => {
  void aiStore.fetchSessions();
  void ensureMessagesAtBottom();
});

onBeforeUnmount(() => {
  if (scrollFrameId) cancelAnimationFrame(scrollFrameId);
  if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
});
</script>

<template>
  <section class="h-full min-h-0 w-full min-w-0">
    <div v-if="!ready" class="ai-layout grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-4">
      <div class="card-base order-1 min-h-[32rem] lg:min-h-0">
        <div class="flex h-full min-h-[28rem] flex-col justify-between">
          <div>
            <div class="h-7 w-48 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
            <div class="mt-6 space-y-4">
              <div class="h-20 w-[72%] rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
              <div class="ml-auto h-16 w-[48%] rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
              <div class="h-24 w-[64%] rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
            </div>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-800/50">
            <div class="h-6 w-full rounded-lg bg-gray-100 dark:bg-gray-800"></div>
            <div class="mt-3 flex items-center justify-between gap-3">
              <div class="h-4 w-24 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
              <div class="h-9 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
            </div>
          </div>
        </div>
      </div>

      <aside class="card-base order-2 min-h-[18rem] lg:min-h-0">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <div class="h-7 w-16 rounded-xl bg-gray-100 dark:bg-gray-800"></div>
            <div class="mt-2 h-4 w-24 rounded-lg bg-gray-100 dark:bg-gray-800"></div>
          </div>
          <div class="h-9 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
        </div>
        <div class="h-11 rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
        <div class="mt-3 space-y-2">
          <div class="h-18 rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
          <div class="h-18 rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
          <div class="h-18 rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
        </div>
      </aside>
    </div>

    <div v-else class="ai-layout grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-4">
      <div class="card-base order-1 min-h-[32rem] lg:min-h-0 mobile-ai-card">
        <template v-if="activeConversation">
          <div class="conversation-transition-stage flex h-full min-h-0 flex-col">
            <Transition :name="conversationTransitionName" @after-enter="scrollMessagesToBottom">
              <div :key="activeConversation.id" class="flex h-full min-h-0 flex-col">
                <header class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-1 pb-3 dark:border-gray-800">
                  <div class="min-w-0">
                    <h2 class="truncate text-lg font-bold text-gray-800 dark:text-gray-100">
                      {{ activeConversation.title }}
                    </h2>
                  </div>

                  <div class="relative ml-auto lg:hidden">
                    <button
                      type="button"
                      class="button-base !h-10 !justify-center !gap-2 !px-3 !py-2"
                      @click="toggleMobileSessionMenu"
                    >
                      <span class="text-sm">会话</span>
                      <BaseIcon name="arrow" :size="14" :class="mobileSessionMenuOpen ? 'rotate-180' : ''" />
                    </button>

                    <div
                      v-if="mobileSessionMenuOpen"
                      class="absolute right-0 top-[calc(100%+8px)] z-20 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                    >
                      <button
                        type="button"
                        class="button-base mb-2 w-full !justify-center"
                        @click="handleCreateConversation"
                      >
                        + 新建对话
                      </button>

                      <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
                        <button
                          v-for="item in filteredConversations"
                          :key="`mobile-${item.id}`"
                          type="button"
                          class="w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors duration-200"
                          :class="item.id === activeConversationId
                            ? 'border-gray-200 bg-gray-100 text-gray-900 dark:border-[var(--border-subtle)] dark:bg-[var(--surface-selected)] dark:text-gray-100'
                            : 'border-transparent bg-gray-50/80 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700/60'"
                          @click="handleSelectConversation(item.id)"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <p class="truncate text-sm font-semibold">{{ item.title }}</p>
                            <span class="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{{ item.updatedAtLabel }}</span>
                          </div>
                          <p class="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            {{ item.preview || "暂无内容" }}
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="flex w-full items-center justify-end gap-2 sm:w-auto">
                    <button type="button" class="button-base !px-3 !py-2 max-sm:!text-xs" :disabled="activeConversation.isTemporary" @click="handleRenameConversation">
                      重命名
                    </button>
                    <button type="button" class="button-base !px-3 !py-2 max-sm:!text-xs" @click="handleDeleteConversation">
                      删除
                    </button>
                  </div>
                </header>

                <div ref="messageScrollRef" class="ai-message-scroll flex-1 space-y-4 overflow-y-auto px-1 py-5 mobile-message-scroll lg:flex-1">
                  <template v-if="activeConversation.messages.length">
                    <div
                      v-for="message in activeConversation.messages"
                      :key="message.id"
                      class="flex"
                      :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                    >
                      <div class="group relative flex max-w-[92%] flex-col gap-2 sm:max-w-[75%]" :class="message.role === 'user' ? 'items-end' : 'items-start'">
                        <div
                          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        >
                          <BaseIcon :name="message.role === 'user' ? 'user' : 'ai'" class="h-5 w-5" />
                        </div>
                        <div
                          class="select-text rounded-[1.4rem] border px-4 py-3 text-[13px] leading-6 shadow-sm"
                          :class="message.role === 'user'
                            ? 'rounded-br-md border-gray-200 bg-gray-100 text-gray-900 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100'
                            : 'rounded-bl-md border-gray-100 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200'"
                        >
                          <div class="markdown-body select-text" v-html="renderMarkdown(message.content)"></div>
                        </div>
                      </div>
                    </div>
                  </template>

                  <div v-else class="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 text-center dark:border-gray-700 dark:bg-gray-800/30">
                    <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                      <BaseIcon name="ai" class="h-7 w-7" />
                    </div>
                    <h3 class="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">开始一段新对话</h3>
                    <p class="mt-2 max-w-xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                      你可以询问记账整理、资产复盘、市场观察或者策略想法。
                    </p>

                    <div class="mt-5 grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-3">
                      <button
                        v-for="item in promptSuggestions"
                        :key="item"
                        type="button"
                        class="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-left text-sm leading-6 text-gray-600 transition-colors duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700/60"
                        @click="handleSuggestion(item)"
                      >
                        {{ item }}
                      </button>
                    </div>
                  </div>

                  <div v-if="isThinking" class="flex justify-start">
                    <div class="inline-flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                      <BaseIcon name="spinner" :spin="true" :size="16" />
                      <span>正在思考中...</span>
                    </div>
                  </div>
                </div>

                <footer class="pt-3 mobile-composer lg:pt-3">
                  <div class="mobile-composer-panel flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-2 dark:border-[var(--border-subtle)] dark:bg-[var(--surface-selected)]">
                    <textarea
                      v-model="draft"
                      rows="1"
                      class="mobile-composer-textarea w-full flex-1 resize-none border-0 bg-transparent text-[13px] leading-6 text-gray-700 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 dark:text-gray-200 dark:placeholder:text-gray-500"
                      placeholder="输入你的问题，按回车发送，Shift+回车换行"
                      @keydown="handleComposerKeydown"
                    />
                    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 max-sm:mt-2 max-sm:flex-nowrap max-sm:gap-2">
                      <p class="text-xs text-gray-400 dark:text-gray-500 max-sm:hidden">已接入 AI 会话接口</p>
                      <button type="button" class="button-base !px-4 !py-2.5 max-sm:w-full max-sm:justify-center max-sm:!py-2" :disabled="isThinking || !draft.trim()" @click="handleSendMessage">
                        发送
                      </button>
                    </div>
                  </div>
                </footer>
              </div>
            </Transition>
          </div>
        </template>
      </div>

      <aside class="card-base order-2 hidden min-h-[18rem] lg:flex lg:min-h-0">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">会话</h2>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">管理当前助手对话</p>
          </div>
          <button type="button" class="button-base !px-3 !py-2" @click="handleCreateConversation">
            <span class="text-base leading-none">+</span>
            <span>新建</span>
          </button>
        </div>

        <label class="mb-3 block">
          <span class="label-text">搜索会话</span>
          <input v-model="keyword" type="text" class="input-base px-4 py-3" placeholder="按标题或摘要筛选" />
        </label>

        <div class="flex-1 space-y-2 overflow-y-auto pr-1">
          <div v-if="loading" class="flex min-h-24 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            正在加载会话...
          </div>

          <button
            v-for="item in filteredConversations"
            :key="item.id"
            type="button"
            class="w-full cursor-pointer rounded-2xl border px-4 py-3 text-left transition-colors duration-200"
            :class="item.id === activeConversationId
              ? 'border-gray-200 bg-gray-100 text-gray-900 dark:border-[var(--border-subtle)] dark:bg-[var(--surface-selected)] dark:text-gray-100'
              : 'border-transparent bg-gray-50/80 text-gray-700 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-700/60'"
            @click="handleSelectConversation(item.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="truncate text-sm font-semibold">{{ item.title }}</p>
              <span class="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">{{ item.updatedAtLabel }}</span>
            </div>
            <p class="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {{ item.preview || "暂无内容" }}
            </p>
          </button>

          <div v-if="!loading && !filteredConversations.length" class="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
            没有匹配的会话
          </div>
        </div>
      </aside>
    </div>

    <Transition name="modal">
      <div
        v-if="renameModalOpen"
        class="fixed inset-0 z-50 grid place-items-center bg-black/18 p-4"
        @click.self="closeRenameModal"
      >
        <div class="modal-content w-full max-w-xl rounded-4xl bg-white p-6 dark:bg-gray-800">
          <header class="mb-5 flex items-center justify-between">
            <h3 class="card-title !p-0">重命名会话</h3>
            <button
              type="button"
              class="button-base !h-8 !w-8 !justify-center !rounded-full !p-0"
              :disabled="renaming"
              @click="closeRenameModal"
            >
              <BaseIcon name="closeIcon" :size="14" />
            </button>
          </header>

          <section class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">会话名称</label>
              <input
                v-model.trim="renameDraft"
                type="text"
                class="input-base px-4 py-3"
                maxlength="60"
                placeholder="请输入会话名称"
                @keydown.enter.prevent="submitRenameConversation"
              />
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" class="button-base !rounded-xl !px-5" :disabled="renaming" @click="closeRenameModal">
                取消
              </button>
              <button type="button" class="button-base !rounded-xl !px-5" :disabled="renaming" @click="submitRenameConversation">
                {{ renaming ? "保存中..." : "保存" }}
              </button>
            </div>
          </section>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped src="@/styles/modal.css"></style>

<style scoped>
.ai-layout {
  height: 100%;
}

.ai-message-scroll {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.ai-message-scroll::-webkit-scrollbar {
  width: 4px;
}

.ai-message-scroll::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background: rgba(148, 163, 184, 0.4);
}

.ai-message-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.dark .ai-message-scroll::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.55);
}

.conversation-transition-stage {
  position: relative;
  overflow: hidden;
}

.page-slide-up-enter-active,
.page-slide-up-leave-active,
.page-slide-down-enter-active,
.page-slide-down-leave-active {
  transition:
    transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.18s ease;
  will-change: transform;
}

.page-slide-up-enter-active,
.page-slide-down-enter-active {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.page-slide-up-leave-active,
.page-slide-down-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
  z-index: 1;
  pointer-events: none;
}

.page-slide-up-enter-from {
  transform: translate3d(0, 24px, 0);
}

.page-slide-up-enter-to,
.page-slide-up-leave-from,
.page-slide-down-enter-to,
.page-slide-down-leave-from {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}

.page-slide-up-leave-to {
  transform: translate3d(0, -24px, 0);
  opacity: 0;
}

.page-slide-down-enter-from {
  transform: translate3d(0, -24px, 0);
  opacity: 0;
}

.page-slide-down-leave-to {
  transform: translate3d(0, 24px, 0);
  opacity: 0;
}

.page-slide-up-enter-from {
  opacity: 0;
}

.markdown-body :deep(*) {
  min-width: 0;
}

.markdown-body {
  user-select: text;
}

.markdown-body :deep(p) {
  margin: 0;
}

.markdown-body :deep(p + p) {
  margin-top: 0.625rem;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 0 0 0.625rem;
  font-weight: 700;
  line-height: 1.4;
}

.markdown-body :deep(h1) {
  font-size: 1.125rem;
}

.markdown-body :deep(h2) {
  font-size: 1rem;
}

.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-size: 0.9375rem;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.625rem 0 0;
  padding-left: 1.25rem;
}

.markdown-body :deep(li + li) {
  margin-top: 0.25rem;
}

.markdown-body :deep(blockquote) {
  margin: 0.75rem 0 0;
  border-left: 3px solid rgba(148, 163, 184, 0.55);
  padding-left: 0.875rem;
  color: rgba(71, 85, 105, 0.95);
}

.dark .markdown-body :deep(blockquote) {
  color: rgba(203, 213, 225, 0.92);
}

.markdown-body :deep(code) {
  border-radius: 0.5rem;
  background: rgba(148, 163, 184, 0.14);
  padding: 0.1rem 0.4rem;
  font-size: 0.92em;
  font-family: Consolas, "Courier New", monospace;
}

.dark .markdown-body :deep(code) {
  background: rgba(51, 65, 85, 0.7);
}

.markdown-body :deep(pre) {
  margin: 0.75rem 0 0;
  overflow-x: auto;
  border-radius: 0.875rem;
  background: rgba(15, 23, 42, 0.92);
  padding: 0.875rem 1rem;
  color: #e2e8f0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: 0.92em;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.dark .markdown-body :deep(a) {
  color: #93c5fd;
}

.markdown-body :deep(table) {
  margin-top: 0.75rem;
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: 0.875rem;
  font-size: 0.96em;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid rgba(203, 213, 225, 0.75);
  padding: 0.5rem 0.625rem;
  text-align: left;
  vertical-align: top;
}

.dark .markdown-body :deep(th),
.dark .markdown-body :deep(td) {
  border-color: rgba(71, 85, 105, 0.75);
}

@media (max-width: 1023px) {
  .ai-layout {
    height: auto;
    min-height: 100%;
  }

  .mobile-ai-card {
    height: calc(100dvh - 8.5rem);
    min-height: 38rem;
  }

  .mobile-message-scroll {
    flex: 5 1 0%;
    min-height: 0;
  }

  .mobile-composer {
    flex: 1 1 0%;
    min-height: 0;
  }

  .mobile-composer-panel {
    min-height: 0;
    overflow: hidden;
  }

  .mobile-composer-textarea {
    min-height: 2.75rem;
    overflow-y: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-slide-up-enter-active,
  .page-slide-up-leave-active,
  .page-slide-down-enter-active,
  .page-slide-down-leave-active {
    transition: none;
  }
}
</style>
