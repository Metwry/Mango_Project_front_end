<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { ElMessage } from "element-plus";
import SmallAccountPicker from "@/components/ui/SmallAccountPicker.vue";
import { filterNonInvestmentAccounts } from "@/utils/accountFilters";

const props = defineProps({
  visible: { type: Boolean, default: false },
  mode: { type: String, default: "buy" },
  position: { type: Object, default: () => ({}) },
  accounts: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "submit"]);

const panelRef = ref(null);
const priceInputRef = ref(null);
const quantityInputRef = ref(null);
const accountPickerRef = ref(null);

const form = reactive({
  price: "",
  quantity: "",
  accountId: "",
});
const advancedMode = ref(false);
const selectableAccounts = computed(() => filterNonInvestmentAccounts(props.accounts));

const isBuy = computed(() => props.mode === "buy");
const safeSymbol = computed(() =>
  String(props.position?.shortCode ?? props.position?.symbol ?? "")
    .trim()
    .toUpperCase(),
);
const safeInstrumentId = computed(() => {
  const n = Number(props.position?.instrumentId ?? props.position?.instrument_id);
  if (!Number.isFinite(n)) return null;
  const id = Math.trunc(n);
  return id > 0 ? id : null;
});
const currentPrice = computed(() => {
  const n = Number(props.position?.currentPrice);
  return Number.isFinite(n) && n > 0 ? n : null;
});
const maxQuantity = computed(() => {
  const n = Number(props.position?.quantity);
  return Number.isFinite(n) && n > 0 ? n : 0;
});

const title = computed(() => (isBuy.value ? "买入" : "卖出"));
const accountLabel = computed(() => (isBuy.value ? "扣款账户" : "收款账户"));
const submitLabel = computed(() => (props.submitting ? "提交中..." : "确定"));

const canSubmit = computed(() => {
  const price = Number(form.price);
  const quantity = Number(form.quantity);
  const accountNumber = Number(form.accountId);
  return (
    Number.isFinite(safeInstrumentId.value) &&
    !props.submitting &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(accountNumber) &&
    accountNumber > 0
  );
});

function pickFirstAccountId() {
  const first = selectableAccounts.value?.[0]?.id;
  if (first === undefined || first === null) return "";
  return first;
}

function resetForm() {
  form.price = currentPrice.value !== null ? String(currentPrice.value) : "";
  form.quantity = "";
  form.accountId = pickFirstAccountId();
  advancedMode.value = false;
}

async function focusPriceInput() {
  await nextTick();
  const tryFocus = () => {
    if (!priceInputRef.value) return false;
    priceInputRef.value.focus();
    priceInputRef.value.select?.();
    return document.activeElement === priceInputRef.value;
  };

  if (tryFocus()) return;
  setTimeout(tryFocus, 40);
  setTimeout(tryFocus, 120);
}

function closePanel() {
  resetForm();
  emit("close");
}

function useMaxQuantity() {
  if (isBuy.value || maxQuantity.value <= 0) return;
  form.quantity = String(maxQuantity.value);
  quantityInputRef.value?.focus();
  quantityInputRef.value?.select?.();
}

function focusAt(index) {
  const total = 3;
  if (total === 0) return;

  const nextIndex = (index + total) % total;
  if (nextIndex === 2) {
    const pickerRoot = accountPickerRef.value?.$el;
    const trigger = pickerRoot?.querySelector("button");
    trigger?.focus?.();
    return;
  }
  const refs = [priceInputRef, quantityInputRef];
  refs[nextIndex]?.value?.focus?.();
}

function moveFocus(currentField, step) {
  const map = { price: 0, quantity: 1, account: 2 };
  const currentIdx = map[currentField];
  if (currentIdx === undefined) return;
  focusAt(currentIdx + step);
}

function submit() {
  if (!canSubmit.value) return;

  const price = Number(form.price);
  const quantity = Number(form.quantity);
  if (!isBuy.value && quantity > maxQuantity.value) {
    ElMessage.warning("卖出数量不能超过当前持仓");
    return;
  }

  const accountRaw = String(form.accountId ?? "").trim();
  const accountNumber = Number(accountRaw);
  const accountId = Number.isFinite(accountNumber) ? Math.trunc(accountNumber) : null;

  emit("submit", {
    mode: props.mode,
    instrument_id: safeInstrumentId.value,
    price,
    quantity,
    cash_account_id: accountId,
  });
}

function onAdvancedChange() {
  ElMessage.info("该功能正在开发");
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      resetForm();
      return;
    }
    resetForm();
    await focusPriceInput();
  },
  { immediate: true },
);

watch(
  () => [props.mode, props.position?.symbol, props.position?.marketType, props.position?.currentPrice],
  async () => {
    if (!props.visible) return;
    resetForm();
    await focusPriceInput();
  },
);

onMounted(() => {
  if (!props.visible) return;
  void focusPriceInput();
});

watch(
  selectableAccounts,
  () => {
    if (!props.visible) return;
    const exists = selectableAccounts.value.some((account) => String(account?.id) === String(form.accountId));
    if (!exists) form.accountId = pickFirstAccountId();
  },
  { deep: true },
);

onClickOutside(panelRef, (event) => {
  if (!props.visible) return;
  const target = event?.target;
  if (target?.closest?.('[data-trade-trigger="true"]')) return;
  if (target?.closest?.('[data-small-account-picker-panel="true"]')) return;
  closePanel();
});
</script>

<template>
  <div v-if="visible" ref="panelRef"
    class="rounded-2xl border border-gray-200 bg-white/97 p-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)] backdrop-blur dark:border-gray-600 dark:bg-gray-800/95">
    <div class="mb-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <p class="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {{ title }} · {{ safeSymbol || "--" }}
        </p>
        <label
          class="inline-flex h-6 cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
          <input v-model="advancedMode" type="checkbox"
            class="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:outline-none focus:ring-0 focus:ring-offset-0 dark:border-gray-500 dark:bg-gray-800"
            @change="onAdvancedChange" />
          <span>高级</span>
        </label>
      </div>
      <button type="button"
        class="button-base !h-7 !w-7 !justify-center !rounded-xl !p-0 !text-xs !text-gray-500 dark:!text-gray-300"
        @click="closePanel">
        ×
      </button>
    </div>

    <div class="space-y-2.5">
      <div>
        <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {{ title }}价
        </label>
        <input ref="priceInputRef" v-model="form.price" type="number" inputmode="decimal" min="0" step="any"
          class="input-base px-3 py-2 text-sm" :placeholder="currentPrice === null ? '请输入价格' : ''"
          @keydown.enter.prevent="submit" @keydown.down.prevent="moveFocus('price', 1)"
          @keydown.up.prevent="moveFocus('price', -1)" />
      </div>

      <div>
        <div class="mb-1 flex items-center justify-between">
          <label class="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {{ title }}数量
          </label>
          <button v-if="!isBuy" type="button"
            class="button-base !h-6 !rounded-lg !px-2 !py-0 !text-[11px] !font-semibold !bg-gray-100 !border-gray-200 dark:!bg-gray-700 dark:!border-gray-600"
            :disabled="maxQuantity <= 0" @click="useMaxQuantity">
            Max
          </button>
        </div>
        <input ref="quantityInputRef" v-model="form.quantity" type="number" inputmode="decimal" min="0" step="any"
          class="input-base px-3 py-2 text-sm" placeholder="请输入数量" @keydown.enter.prevent="submit"
          @keydown.down.prevent="moveFocus('quantity', 1)" @keydown.up.prevent="moveFocus('quantity', -1)" />
      </div>

      <div>
        <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {{ accountLabel }}
        </label>
        <div @keydown.enter.prevent="submit" @keydown.down.prevent="moveFocus('account', 1)"
          @keydown.up.prevent="moveFocus('account', -1)">
          <SmallAccountPicker ref="accountPickerRef" v-model="form.accountId" :accounts="selectableAccounts"
            placeholder="请选择账户" placement="up" :max-list-height="176" />
        </div>
      </div>
    </div>

    <button type="button"
      class="button-base mt-3 w-full !justify-center !rounded-xl !py-2.5 !text-sm !font-semibold"
      :class="isBuy
        ? '!bg-emerald-50 !text-emerald-700 !border-emerald-100 hover:!bg-emerald-100 dark:!bg-emerald-900/30 dark:!text-emerald-200 dark:!border-emerald-800 dark:hover:!bg-emerald-900/50'
        : '!bg-red-50 !text-red-700 !border-red-100 hover:!bg-red-100 dark:!bg-red-900/30 dark:!text-red-200 dark:!border-red-800 dark:hover:!bg-red-900/50'" :disabled="!canSubmit" @click="submit">
      {{ submitLabel }}
    </button>
  </div>
</template>
