import { computed, onUnmounted, ref, watch } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "@/stores/auth";
import { registerByEmail, sendEmailRegisterCode } from "@/utils/auth";

const MODE_META = {
  emailLogin: {
    label: "邮箱登录",
    title: "欢迎回来",
    subtitle: "使用邮箱和密码登录你的资金看板",
    submitLabel: "登录",
  },
  smsLogin: {
    label: "短信登录",
    title: "短信快速登录",
    subtitle: "输入手机号与验证码完成登录",
    submitLabel: "短信登录",
  },
  emailRegister: {
    label: "邮箱注册",
    title: "创建新账号",
    subtitle: "邮箱注册后可统一管理你的账户数据",
    submitLabel: "注册账号",
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

function bindSanitizer(formRef, field, sanitizer) {
  watch(
    () => formRef.value[field],
    (value) => {
      const next = sanitizer(value);
      if (value !== next) formRef.value[field] = next;
    },
  );
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

  const smsCountdown = useCountdown();
  const emailCountdown = useCountdown();
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

  const sendSmsCode = () => {
    if (smsCountdown.seconds.value > 0) return;

    if (!isValidPhone(smsLoginForm.value.phone)) {
      ElMessage.warning("请输入正确的 11 位手机号");
      return;
    }

    smsCountdown.start(60);
    ElMessage.success("验证码已发送（演示）");
  };

  const sendEmailCode = async () => {
    if (emailCountdown.seconds.value > 0 || emailCodeSending.value) return;

    const email = String(emailRegisterForm.value.email ?? "").trim();
    if (!isValidEmail(email)) {
      ElMessage.warning("请输入正确的邮箱地址");
      return;
    }

    emailCodeSending.value = true;
    try {
      await sendEmailRegisterCode(email);
      emailCountdown.start(60);
      ElMessage.success("邮箱验证码已发送");
    } finally {
      emailCodeSending.value = false;
    }
  };

  const submitEmailLogin = async () => {
    const identifier = String(emailLoginForm.value.email ?? "").trim();
    const password = String(emailLoginForm.value.password ?? "");

    if (!identifier || !password) {
      ElMessage.warning("账号和密码不能为空");
      return;
    }

    if (!isValidLoginIdentifier(identifier)) {
      ElMessage.warning("账号仅支持大小写字母、数字和英文符号");
      return;
    }

    loading.value = true;
    try {
      await auth.login(identifier, password, { remember: emailLoginForm.value.remember });
      router.replace("/dashboard");
    } catch {} finally {
      loading.value = false;
    }
  };

  const submitSmsLogin = async () => {
    const { phone, code } = smsLoginForm.value;

    if (!isValidPhone(phone)) {
      ElMessage.warning("请输入正确的 11 位手机号");
      return;
    }

    if (!VERIFY_CODE_PATTERN.test(String(code ?? "").trim())) {
      ElMessage.warning("请输入 4-6 位短信验证码");
      return;
    }

    ElMessage.info("短信登录功能开发中");
  };

  const submitEmailRegister = async () => {
    const { email, code, password, confirmPassword, agree } = emailRegisterForm.value;

    if (!isValidEmail(email)) {
      ElMessage.warning("请输入正确的邮箱地址");
      return;
    }

    if (!VERIFY_CODE_PATTERN.test(String(code ?? "").trim())) {
      ElMessage.warning("请输入 4-6 位邮箱验证码");
      return;
    }

    if (!password || password.length < 6) {
      ElMessage.warning("密码至少 6 位");
      return;
    }

    if (password !== confirmPassword) {
      ElMessage.warning("两次输入的密码不一致");
      return;
    }

    if (!agree) {
      ElMessage.warning("请先勾选协议后再注册");
      return;
    }

    loading.value = true;
    try {
      await registerByEmail({ email, code, password, confirmPassword });
      ElMessage.success("注册成功，请使用密码登录");

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
    const submitters = {
      emailLogin: submitEmailLogin,
      smsLogin: submitSmsLogin,
      emailRegister: submitEmailRegister,
    };

    const submit = submitters[activeMode.value] ?? submitEmailLogin;
    await submit();
  };

  const switchMode = (mode) => {
    if (mode === activeMode.value) return;

    const nextIndex = modeOptions.findIndex((item) => item.key === mode);
    slideDirection.value = nextIndex > previousModeIndex.value ? "next" : "prev";
    previousModeIndex.value = nextIndex;

    activeMode.value = mode;
  };

  bindSanitizer(emailLoginForm, "email", toAsciiPrintableNoSpace);
  bindSanitizer(emailLoginForm, "password", toAsciiPrintableNoSpace);
  bindSanitizer(smsLoginForm, "phone", (value) => toDigits(value, 11));
  bindSanitizer(smsLoginForm, "code", (value) => toDigits(value, 6));
  bindSanitizer(emailRegisterForm, "email", toAsciiPrintableNoSpace);
  bindSanitizer(emailRegisterForm, "code", (value) => toDigits(value, 6));
  bindSanitizer(emailRegisterForm, "password", toAsciiPrintableNoSpace);
  bindSanitizer(emailRegisterForm, "confirmPassword", toAsciiPrintableNoSpace);

  onUnmounted(() => {
    smsCountdown.stop();
    emailCountdown.stop();
  });

  return {
    activeMode,
    emailCodeCountdown: emailCountdown.seconds,
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
    smsCodeCountdown: smsCountdown.seconds,
    smsLoginForm,
    submitLabel,
    switchMode,
    transitionName,
  };
}
