import { computed, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { registerByEmail, sendEmailRegisterCode } from "@/utils/auth";

const MODE_META = {
  emailLogin: {
    label: "\u90ae\u7bb1\u767b\u5f55",
    title: "\u6b22\u8fce\u56de\u6765",
    subtitle: "\u4f7f\u7528\u90ae\u7bb1\u548c\u5bc6\u7801\u767b\u5f55\u4f60\u7684\u8d44\u91d1\u770b\u677f",
    submitLabel: "\u767b\u5f55",
  },
  smsLogin: {
    label: "\u77ed\u4fe1\u767b\u5f55",
    title: "\u77ed\u4fe1\u5feb\u901f\u767b\u5f55",
    subtitle: "\u8f93\u5165\u624b\u673a\u53f7\u4e0e\u9a8c\u8bc1\u7801\u5b8c\u6210\u767b\u5f55",
    submitLabel: "\u77ed\u4fe1\u767b\u5f55",
  },
  emailRegister: {
    label: "\u90ae\u7bb1\u6ce8\u518c",
    title: "\u521b\u5efa\u65b0\u8d26\u53f7",
    subtitle: "\u90ae\u7bb1\u6ce8\u518c\u540e\u53ef\u7edf\u4e00\u7ba1\u7406\u4f60\u7684\u8d26\u6237\u6570\u636e",
    submitLabel: "\u6ce8\u518c\u8d26\u53f7",
  },
};

const modeOptions = Object.entries(MODE_META).map(([key, meta]) => ({
  key,
  label: meta.label,
}));

const VERIFY_CODE_PATTERN = /^\d{4,6}$/;
const ASCII_PRINTABLE_NO_SPACE_PATTERN = /[^\x21-\x7e]/g;
const LOGIN_IDENTIFIER_PATTERN = /^[\x21-\x7e]+$/;

function toAsciiPrintableNoSpace(value) {
  return String(value ?? "").replace(ASCII_PRINTABLE_NO_SPACE_PATTERN, "");
}

function toDigits(value, maxLength = Infinity) {
  return String(value ?? "")
    .replace(/\D+/g, "")
    .slice(0, maxLength);
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

  const smsLoginForm = ref({
    phone: "",
    code: "",
  });

  const emailRegisterForm = ref({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const smsCodeCountdown = ref(0);
  const emailCodeCountdown = ref(0);
  const smsCodeTimerRef = ref(null);
  const emailCodeTimerRef = ref(null);
  const emailCodeSending = ref(false);

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

  const isValidEmail = (value) => {
    const email = String(value ?? "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidLoginIdentifier = (value) => {
    const normalized = String(value ?? "").trim();
    return LOGIN_IDENTIFIER_PATTERN.test(normalized);
  };

  const isValidPhone = (value) => {
    const phone = String(value ?? "").trim();
    return /^1\d{10}$/.test(phone);
  };

  const stopTimer = (timerRef) => {
    if (!timerRef.value) return;
    clearInterval(timerRef.value);
    timerRef.value = null;
  };

  const startCountdown = (target, timerRef) => {
    stopTimer(timerRef);
    target.value = 60;
    timerRef.value = setInterval(() => {
      if (target.value <= 1) {
        target.value = 0;
        stopTimer(timerRef);
        return;
      }
      target.value -= 1;
    }, 1000);
  };

  const sendCodeWithCountdown = ({
    countdown,
    timerRef,
    isValid,
    invalidMessage,
    successMessage,
  }) => {
    if (countdown.value > 0) return;
    if (!isValid()) {
      ElMessage.warning(invalidMessage);
      return;
    }

    startCountdown(countdown, timerRef);
    ElMessage.success(successMessage);
  };

  const sendSmsCode = () => {
    sendCodeWithCountdown({
      countdown: smsCodeCountdown,
      timerRef: smsCodeTimerRef,
      isValid: () => isValidPhone(smsLoginForm.value.phone),
      invalidMessage: "\u8bf7\u8f93\u5165\u6b63\u786e\u7684 11 \u4f4d\u624b\u673a\u53f7",
      successMessage: "\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001\uff08\u6f14\u793a\uff09",
    });
  };

  const sendEmailCode = async () => {
    if (emailCodeCountdown.value > 0 || emailCodeSending.value) return;

    const email = String(emailRegisterForm.value.email ?? "").trim();
    if (!isValidEmail(email)) {
      ElMessage.warning("\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u90ae\u7bb1\u5730\u5740");
      return;
    }

    emailCodeSending.value = true;
    try {
      await sendEmailRegisterCode(email);
      startCountdown(emailCodeCountdown, emailCodeTimerRef);
      ElMessage.success("\u90ae\u7bb1\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001");
    } finally {
      emailCodeSending.value = false;
    }
  };

  const withLoading = async (message) => {
    loading.value = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      ElMessage.success(message);
    } finally {
      loading.value = false;
    }
  };

  const submitEmailLogin = async () => {
    const identifier = String(emailLoginForm.value.email ?? "").trim();
    const password = String(emailLoginForm.value.password ?? "");

    if (!identifier || !password) {
      ElMessage.warning("\u8d26\u53f7\u548c\u5bc6\u7801\u4e0d\u80fd\u4e3a\u7a7a");
      return;
    }

    if (!isValidLoginIdentifier(identifier)) {
      ElMessage.warning("\u8d26\u53f7\u4ec5\u652f\u6301\u5927\u5c0f\u5199\u5b57\u6bcd\u3001\u6570\u5b57\u548c\u82f1\u6587\u7b26\u53f7");
      return;
    }

    loading.value = true;
    try {
      await auth.login(identifier, password, { remember: emailLoginForm.value.remember });
      router.replace("/dashboard");
    } catch (err) {
      const message =
        err.response?.data?.detail ??
        "\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5";
      ElMessage.error(message);
    } finally {
      loading.value = false;
    }
  };

  const submitSmsLogin = async () => {
    const { phone, code } = smsLoginForm.value;

    if (!isValidPhone(phone)) {
      ElMessage.warning("\u8bf7\u8f93\u5165\u6b63\u786e\u7684 11 \u4f4d\u624b\u673a\u53f7");
      return;
    }

    if (!VERIFY_CODE_PATTERN.test(String(code ?? "").trim())) {
      ElMessage.warning("\u8bf7\u8f93\u5165 4-6 \u4f4d\u77ed\u4fe1\u9a8c\u8bc1\u7801");
      return;
    }

    await withLoading("\u77ed\u4fe1\u767b\u5f55\u8868\u5355\u6821\u9a8c\u901a\u8fc7\uff0c\u5f85\u63a5\u5165\u63a5\u53e3");
  };

  const submitEmailRegister = async () => {
    const { email, code, password, confirmPassword, agree } = emailRegisterForm.value;

    if (!isValidEmail(email)) {
      ElMessage.warning("\u8bf7\u8f93\u5165\u6b63\u786e\u7684\u90ae\u7bb1\u5730\u5740");
      return;
    }

    if (!VERIFY_CODE_PATTERN.test(String(code ?? "").trim())) {
      ElMessage.warning("\u8bf7\u8f93\u5165 4-6 \u4f4d\u90ae\u7bb1\u9a8c\u8bc1\u7801");
      return;
    }

    if (!password || password.length < 6) {
      ElMessage.warning("\u5bc6\u7801\u81f3\u5c11 6 \u4f4d");
      return;
    }

    if (password !== confirmPassword) {
      ElMessage.warning("\u4e24\u6b21\u8f93\u5165\u7684\u5bc6\u7801\u4e0d\u4e00\u81f4");
      return;
    }

    if (!agree) {
      ElMessage.warning("\u8bf7\u5148\u52fe\u9009\u534f\u8bae\u540e\u518d\u6ce8\u518c");
      return;
    }

    loading.value = true;
    try {
      await registerByEmail({ email, code, password, confirmPassword });
      ElMessage.success("\u6ce8\u518c\u6210\u529f\uff0c\u8bf7\u4f7f\u7528\u5bc6\u7801\u767b\u5f55");

      emailLoginForm.value.email = email;
      emailLoginForm.value.password = "";
      emailRegisterForm.value = {
        email: "",
        code: "",
        password: "",
        confirmPassword: "",
        agree: false,
      };
      switchMode("emailLogin");
    } finally {
      loading.value = false;
    }
  };

  const handleSubmit = async () => {
    if (activeMode.value === "emailLogin") {
      await submitEmailLogin();
      return;
    }

    if (activeMode.value === "smsLogin") {
      await submitSmsLogin();
      return;
    }

    await submitEmailRegister();
  };

  const switchMode = (mode) => {
    if (mode === activeMode.value) return;

    const nextIndex = modeOptions.findIndex((item) => item.key === mode);
    slideDirection.value = nextIndex > previousModeIndex.value ? "next" : "prev";
    previousModeIndex.value = nextIndex;

    activeMode.value = mode;
  };

  watch(
    () => emailLoginForm.value.email,
    (value) => {
      const next = toAsciiPrintableNoSpace(value);
      if (value !== next) emailLoginForm.value.email = next;
    },
  );

  watch(
    () => emailLoginForm.value.password,
    (value) => {
      const next = toAsciiPrintableNoSpace(value);
      if (value !== next) emailLoginForm.value.password = next;
    },
  );

  watch(
    () => smsLoginForm.value.phone,
    (value) => {
      const next = toDigits(value, 11);
      if (value !== next) smsLoginForm.value.phone = next;
    },
  );

  watch(
    () => smsLoginForm.value.code,
    (value) => {
      const next = toDigits(value, 6);
      if (value !== next) smsLoginForm.value.code = next;
    },
  );

  watch(
    () => emailRegisterForm.value.email,
    (value) => {
      const next = toAsciiPrintableNoSpace(value);
      if (value !== next) emailRegisterForm.value.email = next;
    },
  );

  watch(
    () => emailRegisterForm.value.code,
    (value) => {
      const next = toDigits(value, 6);
      if (value !== next) emailRegisterForm.value.code = next;
    },
  );

  watch(
    () => emailRegisterForm.value.password,
    (value) => {
      const next = toAsciiPrintableNoSpace(value);
      if (value !== next) emailRegisterForm.value.password = next;
    },
  );

  watch(
    () => emailRegisterForm.value.confirmPassword,
    (value) => {
      const next = toAsciiPrintableNoSpace(value);
      if (value !== next) emailRegisterForm.value.confirmPassword = next;
    },
  );

  onUnmounted(() => {
    stopTimer(smsCodeTimerRef);
    stopTimer(emailCodeTimerRef);
  });

  return {
    activeMode,
    emailCodeCountdown,
    emailCodeSending,
    emailLoginForm,
    emailRegisterForm,
    handleSubmit,
    loading,
    modeIndex,
    modeOptions,
    modeSubtitle,
    modeTitle,
    sendEmailCode,
    sendSmsCode,
    smsCodeCountdown,
    smsLoginForm,
    submitLabel,
    switchMode,
    transitionName,
  };
}
