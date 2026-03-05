<script setup>
import { computed, ref, watch } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { ElMessage } from "element-plus";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import { useAuthStore } from "@/stores/auth";
import { getPayload } from "@/utils/api";
import {
  resetPasswordByEmail,
  sendPasswordResetEmailCode,
  updateUsername,
} from "@/utils/auth";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const authStore = useAuthStore();
const panelMode = ref("menu");
const submitting = ref(false);
const codeSending = ref(false);
const codeCountdown = ref(0);

const usernameForm = ref({
  username: "",
});

const passwordForm = ref({
  email: "",
  code: "",
  password: "",
});

const { pause, resume } = useIntervalFn(() => {
  if (codeCountdown.value <= 1) {
    codeCountdown.value = 0;
    pause();
    return;
  }
  codeCountdown.value -= 1;
}, 1000, { immediate: false });

const modalTitle = computed(() => {
  if (panelMode.value === "username") return "修改用户名";
  if (panelMode.value === "password") return "修改密码";
  return "用户设置";
});

function resetModalState() {
  panelMode.value = "menu";
  usernameForm.value.username = String(authStore.user?.username ?? "").trim();
  passwordForm.value = {
    email: String(authStore.user?.email ?? "").trim(),
    code: "",
    password: "",
  };
  submitting.value = false;
  codeSending.value = false;
  codeCountdown.value = 0;
  pause();
}

function closeModal() {
  emit("close");
}

function openUsernamePanel() {
  panelMode.value = "username";
}

function openPasswordPanel() {
  panelMode.value = "password";
}

function backToMenu() {
  panelMode.value = "menu";
}

async function submitUsernameUpdate() {
  const username = String(usernameForm.value.username ?? "").trim();
  if (!username) {
    ElMessage.warning("请输入用户名");
    return;
  }

  submitting.value = true;
  try {
    const res = await updateUsername(username);
    const payload = getPayload(res, {});
    const userPayload = payload?.user ?? {};
    authStore.setUser({
      ...authStore.user,
      ...userPayload,
      username: String(userPayload?.username ?? username).trim(),
    });
    ElMessage.success(payload?.message || "用户名修改成功");
    closeModal();
  } finally {
    submitting.value = false;
  }
}

async function sendPasswordCode() {
  if (codeSending.value || codeCountdown.value > 0) return;

  const email = String(passwordForm.value.email ?? "").trim();
  if (!email) {
    ElMessage.warning("邮箱不能为空");
    return;
  }

  codeSending.value = true;
  try {
    await sendPasswordResetEmailCode(email);
    codeCountdown.value = 60;
    resume();
    ElMessage.success("邮箱验证码已发送");
  } finally {
    codeSending.value = false;
  }
}

async function submitPasswordUpdate() {
  const email = String(passwordForm.value.email ?? "").trim();
  const code = String(passwordForm.value.code ?? "").trim();
  const password = String(passwordForm.value.password ?? "");

  if (!email || !code || !password) {
    ElMessage.warning("请填写完整信息");
    return;
  }

  submitting.value = true;
  try {
    const res = await resetPasswordByEmail({ email, code, password });
    const payload = getPayload(res, {});
    ElMessage.success(payload?.message || "密码重置成功");
    passwordForm.value.code = "";
    passwordForm.value.password = "";
    backToMenu();
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      resetModalState();
      return;
    }
    pause();
  },
  { immediate: true },
);
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" @click.self="closeModal">
      <div class="modal-content w-full max-w-xl rounded-4xl bg-white p-6 dark:bg-gray-800">
        <header class="mb-5 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button v-if="panelMode !== 'menu'" type="button"
              class="button-base !h-8 !w-8 !justify-center !rounded-full !p-0" @click="backToMenu">
              <BaseIcon name="leftArrow" :size="14" />
            </button>
            <h3 class="card-title !p-0">{{ modalTitle }}</h3>
          </div>

          <button type="button" class="button-base !h-8 !w-8 !justify-center !rounded-full !p-0" @click="closeModal">
            <BaseIcon name="closeIcon" :size="14" />
          </button>
        </header>

        <section v-if="panelMode === 'menu'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button type="button"
            class="button-base min-h-[112px] !flex-col !justify-center !rounded-2xl border-2 text-center"
            @click="openUsernamePanel">
            <span class="text-sm font-semibold">修改用户名</span>

          </button>
          <button type="button"
            class="button-base min-h-[112px] !flex-col !justify-center !rounded-2xl border-2 text-center"
            @click="openPasswordPanel">
            <span class="text-sm font-semibold">修改密码</span>

          </button>
        </section>

        <section v-else-if="panelMode === 'username'" class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">新用户名</label>
            <input v-model.trim="usernameForm.username" type="text" class="input-base px-4 py-3" placeholder="请输入用户名" />
          </div>
          <div class="flex justify-end">
            <button type="button" class="button-base !rounded-xl !px-5" :disabled="submitting"
              @click="submitUsernameUpdate">
              {{ submitting ? "提交中..." : "确认修改" }}
            </button>
          </div>
        </section>

        <section v-else class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">邮箱</label>
            <input v-model.trim="passwordForm.email" type="email" class="input-base px-4 py-3" readonly />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">邮箱验证码</label>
            <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input v-model.trim="passwordForm.code" type="text" maxlength="6" class="input-base px-4 py-3"
                placeholder="请输入验证码" />
              <button type="button" class="button-base justify-center px-4 py-3 text-sm sm:min-w-[120px]"
                :disabled="codeSending || codeCountdown > 0" @click="sendPasswordCode">
                {{ codeSending ? "发送中..." : codeCountdown > 0 ? `${codeCountdown}s` : "发送验证码" }}
              </button>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">新密码</label>
            <input v-model="passwordForm.password" type="password" class="input-base px-4 py-3" placeholder="请输入新密码" />
          </div>

          <div class="flex justify-end">
            <button type="button" class="button-base !rounded-xl !px-5" :disabled="submitting"
              @click="submitPasswordUpdate">
              {{ submitting ? "提交中..." : "确认修改" }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </Transition>
</template>

<style scoped src="@/styles/modal.css"></style>
