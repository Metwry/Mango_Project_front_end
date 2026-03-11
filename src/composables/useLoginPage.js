import { computed, onUnmounted, ref } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { useRouter } from "vue-router";
import { ElMessage } from "@/utils/element";
import { useAuthStore } from "@/stores/auth";
import {
  registerByEmail,
  resetPasswordByEmail,
  sendEmailRegisterCode,
  sendPasswordResetEmailCode,
} from "@/utils/auth";

const MODE_META = {
  emailLogin: {
    label: "邮箱登录",
    title: "欢迎回来",
    subtitle: "使用邮箱和密码登录你的资金看板",
    submitLabel: "登录",
  },
  emailRegister: {
    label: "邮箱注册",
    title: "创建新账号",
    subtitle: "邮箱注册后可统一管理你的账户数据",
    submitLabel: "注册账号",
  },
  emailReset: {
    label: "忘记密码",
    title: "重置密码",
    subtitle: "通过邮箱验证码设置新密码",
    submitLabel: "重置密码",
  },
};

const modeOptions = Object.entries(MODE_META).map(([key, meta]) => ({
  key,
  label: meta.label,
}));

function toDigits(value, maxLength = Infinity) {
  return String(value ?? "")
    .replace(/\D+/g, "")
    .slice(0, maxLength);
}

function useCountdown() {
  const seconds = ref(0);
  const { pause, resume } = useIntervalFn(() => {
    if (seconds.value <= 1) {
      seconds.value = 0;
      pause();
      return;
    }
    seconds.value -= 1;
  }, 1000, { immediate: false });

  const start = (duration = 60) => {
    seconds.value = Math.max(0, Number(duration) || 0);
    if (seconds.value > 0) resume();
  };

  const stop = () => {
    seconds.value = 0;
    pause();
  };

  return {
    seconds,
    start,
    stop,
  };
}

function isValidEmail(value) {
  const email = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractErrorMessage(error) {
  const payload = error?.response?.data;
  const raw = payload?.message ?? payload?.massage;

  if (typeof raw === "string") return raw.trim() || "登录失败";
  if (Array.isArray(raw)) {
    const first = raw.find((item) => typeof item === "string" && item.trim());
    if (first) return first.trim();
  }

  return "登录失败，请检查账号和密码";
}

export function useLoginPage() {
  const auth = useAuthStore();
  const router = useRouter();

  const activeMode = ref("emailLogin");
  const loading = ref(false);

  const emailLoginForm = ref({
    email: "",
    password: "",
    remember: true,
  });

  const emailRegisterForm = ref({
    email: "",
    code: "",
    password: "",
  });

  const emailResetForm = ref({
    email: "",
    code: "",
    password: "",
  });

  const registerCountdown = useCountdown();
  const resetCountdown = useCountdown();
  const registerCodeSending = ref(false);
  const resetCodeSending = ref(false);

  const previousModeIndex = ref(0);
  const slideDirection = ref("next");

  const modeIndex = computed(() => {
    return modeOptions.findIndex((mode) => mode.key === activeMode.value);
  });

  const transitionName = computed(() => {
    return slideDirection.value === "next" ? "mode-slide-next" : "mode-slide-prev";
  });

  const modeTitle = computed(() => MODE_META[activeMode.value]?.title ?? "");
  const modeSubtitle = computed(() => MODE_META[activeMode.value]?.subtitle ?? "");
  const submitLabel = computed(() => MODE_META[activeMode.value]?.submitLabel ?? "");

  const switchMode = (mode) => {
    if (mode === activeMode.value) return;
    const nextIndex = modeOptions.findIndex((item) => item.key === mode);
    slideDirection.value = nextIndex > previousModeIndex.value ? "next" : "prev";
    previousModeIndex.value = nextIndex;
    activeMode.value = mode;
  };

  const sendRegisterEmailCodeAction = async () => {
    if (registerCountdown.seconds.value > 0 || registerCodeSending.value) return;

    const email = String(emailRegisterForm.value.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      ElMessage.warning("请输入正确的邮箱地址");
      return;
    }

    registerCodeSending.value = true;
    try {
      await sendEmailRegisterCode(email);
      registerCountdown.start(60);
      ElMessage.success("邮箱验证码已发送");
    } finally {
      registerCodeSending.value = false;
    }
  };

  const sendResetEmailCodeAction = async () => {
    if (resetCountdown.seconds.value > 0 || resetCodeSending.value) return;

    const email = String(emailResetForm.value.email ?? "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      ElMessage.warning("请输入正确的邮箱地址");
      return;
    }

    resetCodeSending.value = true;
    try {
      await sendPasswordResetEmailCode(email);
      resetCountdown.start(60);
      ElMessage.success("邮箱验证码已发送");
    } finally {
      resetCodeSending.value = false;
    }
  };

  const submitEmailLogin = async () => {
    const email = String(emailLoginForm.value.email ?? "").trim();
    const password = String(emailLoginForm.value.password ?? "");
    if (!email || !password) {
      ElMessage.warning("邮箱和密码不能为空");
      return;
    }

    loading.value = true;
    try {
      await auth.login(email, password, { remember: emailLoginForm.value.remember });
      router.replace("/dashboard");
    } catch (error) {
      ElMessage.error(extractErrorMessage(error));
    } finally {
      loading.value = false;
    }
  };

  const submitEmailRegister = async () => {
    const email = String(emailRegisterForm.value.email ?? "").trim().toLowerCase();
    const code = toDigits(emailRegisterForm.value.code, 6);
    const password = String(emailRegisterForm.value.password ?? "");

    if (!email || !code || !password) {
      ElMessage.warning("请填写完整信息");
      return;
    }

    loading.value = true;
    try {
      await registerByEmail({ email, code, password });
      ElMessage.success("注册成功，请使用新密码登录");
      emailLoginForm.value.email = email;
      emailLoginForm.value.password = "";
      switchMode("emailLogin");
    } finally {
      loading.value = false;
    }
  };

  const submitEmailReset = async () => {
    const email = String(emailResetForm.value.email ?? "").trim().toLowerCase();
    const code = toDigits(emailResetForm.value.code, 6);
    const password = String(emailResetForm.value.password ?? "");

    if (!email || !code || !password) {
      ElMessage.warning("请填写完整信息");
      return;
    }

    loading.value = true;
    try {
      await resetPasswordByEmail({ email, code, password });
      ElMessage.success("密码重置成功，请重新登录");
      emailLoginForm.value.email = email;
      emailLoginForm.value.password = password;
      emailResetForm.value = {
        email: "",
        code: "",
        password: "",
      };
      switchMode("emailLogin");
    } finally {
      loading.value = false;
    }
  };

  const handleSubmit = async () => {
    const submitterMap = {
      emailLogin: submitEmailLogin,
      emailRegister: submitEmailRegister,
      emailReset: submitEmailReset,
    };

    const submitter = submitterMap[activeMode.value] ?? submitEmailLogin;
    await submitter();
  };

  onUnmounted(() => {
    registerCountdown.stop();
    resetCountdown.stop();
  });

  return {
    activeMode,
    emailCodeCountdown: registerCountdown.seconds,
    emailCodeSending: registerCodeSending,
    emailLoginForm,
    emailRegisterForm,
    emailResetForm,
    handleSubmit,
    loading,
    modeIndex,
    modeOptions,
    modeSubtitle,
    modeTitle,
    resetCodeCountdown: resetCountdown.seconds,
    resetCodeSending,
    sendEmailCode: sendRegisterEmailCodeAction,
    sendResetEmailCode: sendResetEmailCodeAction,
    submitLabel,
    switchMode,
    transitionName,
  };
}
