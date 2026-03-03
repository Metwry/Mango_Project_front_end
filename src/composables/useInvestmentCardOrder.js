import { computed, ref, watch } from "vue";
import { useStorage } from "@vueuse/core";

const POSITION_ORDER_STORAGE_KEY = "investment_position_card_order_v1";

function normalizeOrder(value) {
  if (!Array.isArray(value)) return [];
  const dedup = new Set();
  const next = [];
  value.forEach((item) => {
    const key = String(item ?? "").trim();
    if (!key || dedup.has(key)) return;
    dedup.add(key);
    next.push(key);
  });
  return next;
}

function getPositionKey(position) {
  const instrumentId = Number(position?.instrumentId ?? position?.instrument_id);
  if (Number.isFinite(instrumentId) && instrumentId > 0) {
    return `instrument:${Math.trunc(instrumentId)}`;
  }

  const market = String(position?.marketType ?? position?.market_type ?? "").trim().toUpperCase();
  const symbol = String(position?.symbol ?? position?.shortCode ?? position?.short_code ?? "")
    .trim()
    .toUpperCase();
  const name = String(position?.name ?? "").trim().toUpperCase();
  return `fallback:${market}__${symbol || name || "UNKNOWN"}`;
}

function swapOrder(order, sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return order;

  const next = [...order];
  const fromIdx = next.indexOf(sourceKey);
  const toIdx = next.indexOf(targetKey);
  if (fromIdx < 0 || toIdx < 0) return order;

  [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
  return next;
}

export function useInvestmentCardOrder(positions) {
  const draggingKey = ref("");
  const positionOrder = useStorage(POSITION_ORDER_STORAGE_KEY, []);

  positionOrder.value = normalizeOrder(positionOrder.value);

  const positionKeys = computed(() => {
    const rows = Array.isArray(positions?.value) ? positions.value : [];
    return rows
      .map((item) => getPositionKey(item))
      .filter((item) => !!item);
  });

  function syncPositionOrder() {
    const latestKeys = positionKeys.value;
    const liveKeySet = new Set(latestKeys);

    const retained = normalizeOrder(positionOrder.value).filter((key) => liveKeySet.has(key));
    const added = latestKeys.filter((key) => !retained.includes(key));
    const nextOrder = [...retained, ...added];

    if (JSON.stringify(positionOrder.value) === JSON.stringify(nextOrder)) return;
    positionOrder.value = nextOrder;
  }

  const orderedPositions = computed(() => {
    const rows = Array.isArray(positions?.value) ? positions.value : [];
    const orderMap = new Map();
    normalizeOrder(positionOrder.value).forEach((key, idx) => orderMap.set(key, idx));

    return [...rows].sort((a, b) => {
      const aKey = getPositionKey(a);
      const bKey = getPositionKey(b);
      const aIdx = orderMap.has(aKey) ? orderMap.get(aKey) : Number.MAX_SAFE_INTEGER;
      const bIdx = orderMap.has(bKey) ? orderMap.get(bKey) : Number.MAX_SAFE_INTEGER;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return aKey.localeCompare(bKey, "zh-CN");
    });
  });

  watch(positionKeys, () => {
    syncPositionOrder();
  }, { immediate: true });

  function onCardDragStart(position, event) {
    const key = getPositionKey(position);
    if (!key) return;

    draggingKey.value = key;
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    }
  }

  function onCardDragOver(position, event) {
    const targetKey = getPositionKey(position);
    if (!draggingKey.value || !targetKey || draggingKey.value === targetKey) return;
    event.preventDefault();
    if (event?.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function onCardDrop(position, event) {
    event.preventDefault();
    const targetKey = getPositionKey(position);
    const sourceKey = draggingKey.value || event?.dataTransfer?.getData("text/plain") || "";
    positionOrder.value = swapOrder(normalizeOrder(positionOrder.value), sourceKey, targetKey);
    draggingKey.value = "";
  }

  function onCardDragEnd() {
    draggingKey.value = "";
  }

  function isDragging(position) {
    return draggingKey.value === getPositionKey(position);
  }

  return {
    getPositionKey,
    isDragging,
    onCardDragEnd,
    onCardDragOver,
    onCardDrop,
    onCardDragStart,
    orderedPositions,
  };
}
