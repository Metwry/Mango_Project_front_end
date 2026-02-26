<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const modeOptions = [
  { key: 'emailLogin', label: '邮箱登录' },
  { key: 'smsLogin', label: '短信登录' },
  { key: 'emailRegister', label: '邮箱注册' }
]

const activeMode = ref('emailLogin')
const loading = ref(false)
const errorMsg = ref('')

const emailLoginForm = ref({
  email: '',
  password: '',
  remember: true
})

const smsLoginForm = ref({
  phone: '',
  code: ''
})

const emailRegisterForm = ref({
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
  agree: false
})

const smsCodeCountdown = ref(0)
const emailCodeCountdown = ref(0)
const smsCodeTimerRef = ref(null)
const emailCodeTimerRef = ref(null)

const previousModeIndex = ref(0)
const slideDirection = ref('next')

const modeIndex = computed(() => modeOptions.findIndex((mode) => mode.key === activeMode.value))

const transitionName = computed(() => {
  return slideDirection.value === 'next' ? 'mode-slide-next' : 'mode-slide-prev'
})

const modeTitle = computed(() => {
  const map = {
    emailLogin: '欢迎回来',
    smsLogin: '短信快速登录',
    emailRegister: '创建新账号'
  }
  return map[activeMode.value]
})

const modeSubtitle = computed(() => {
  const map = {
    emailLogin: '使用邮箱和密码登录你的资金看板',
    smsLogin: '输入手机号与验证码完成登录',
    emailRegister: '邮箱注册后可统一管理你的账户数据'
  }
  return map[activeMode.value]
})

const submitLabel = computed(() => {
  const map = {
    emailLogin: '登录',
    smsLogin: '短信登录',
    emailRegister: '注册账号'
  }
  return map[activeMode.value]
})

const isValidEmail = (value) => {
  const email = String(value ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const isValidPhone = (value) => {
  const phone = String(value ?? '').trim()
  return /^1\d{10}$/.test(phone)
}

const stopTimer = (timerRef) => {
  if (!timerRef.value) return
  clearInterval(timerRef.value)
  timerRef.value = null
}

const startCountdown = (target, timerRef) => {
  stopTimer(timerRef)
  target.value = 60
  timerRef.value = setInterval(() => {
    if (target.value <= 1) {
      target.value = 0
      stopTimer(timerRef)
      return
    }
    target.value -= 1
  }, 1000)
}

const sendSmsCode = () => {
  if (smsCodeCountdown.value > 0) return

  if (!isValidPhone(smsLoginForm.value.phone)) {
    ElMessage.warning('请输入正确的 11 位手机号')
    return
  }

  startCountdown(smsCodeCountdown, smsCodeTimerRef)
  ElMessage.success('验证码已发送（演示）')
}

const sendEmailCode = () => {
  if (emailCodeCountdown.value > 0) return

  if (!isValidEmail(emailRegisterForm.value.email)) {
    ElMessage.warning('请输入正确的邮箱地址')
    return
  }

  startCountdown(emailCodeCountdown, emailCodeTimerRef)
  ElMessage.success('邮箱验证码已发送（演示）')
}

const withLoading = async (message) => {
  loading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))
    ElMessage.success(message)
  } finally {
    loading.value = false
  }
}

const submitEmailLogin = async () => {
  errorMsg.value = ''

  const email = String(emailLoginForm.value.email ?? '').trim()
  const password = String(emailLoginForm.value.password ?? '')
  const isTestAccount = email === 'test'

  if (!email || !password) {
    errorMsg.value = '邮箱和密码不能为空'
    return
  }

  if (!isTestAccount && !isValidEmail(email)) {
    errorMsg.value = '请输入正确的邮箱地址'
    return
  }

  loading.value = true
  try {
    await auth.login(email, password, { remember: emailLoginForm.value.remember })
    router.replace('/dashboard')
  } catch (err) {
    if (err.response?.data?.detail) {
      errorMsg.value = err.response.data.detail
    } else {
      errorMsg.value = '登录失败，请稍后再试'
    }
  } finally {
    loading.value = false
  }
}

const submitSmsLogin = async () => {
  const { phone, code } = smsLoginForm.value

  if (!isValidPhone(phone)) {
    ElMessage.warning('请输入正确的 11 位手机号')
    return
  }

  if (!/^\d{4,6}$/.test(String(code ?? '').trim())) {
    ElMessage.warning('请输入 4-6 位短信验证码')
    return
  }

  await withLoading('短信登录表单校验通过，待接入接口')
}

const submitEmailRegister = async () => {
  const { email, code, password, confirmPassword, agree } = emailRegisterForm.value

  if (!isValidEmail(email)) {
    ElMessage.warning('请输入正确的邮箱地址')
    return
  }

  if (!/^\d{4,6}$/.test(String(code ?? '').trim())) {
    ElMessage.warning('请输入 4-6 位邮箱验证码')
    return
  }

  if (!password || password.length < 6) {
    ElMessage.warning('密码至少 6 位')
    return
  }

  if (password !== confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  if (!agree) {
    ElMessage.warning('请先勾选协议后再注册')
    return
  }

  await withLoading('注册表单校验通过，待接入接口')
}

const handleSubmit = async () => {
  if (activeMode.value === 'emailLogin') {
    await submitEmailLogin()
    return
  }

  if (activeMode.value === 'smsLogin') {
    await submitSmsLogin()
    return
  }

  await submitEmailRegister()
}

const switchMode = (mode) => {
  if (mode === activeMode.value) return

  const nextIndex = modeOptions.findIndex((item) => item.key === mode)
  slideDirection.value = nextIndex > previousModeIndex.value ? 'next' : 'prev'
  previousModeIndex.value = nextIndex

  activeMode.value = mode
  errorMsg.value = ''
}

onUnmounted(() => {
  stopTimer(smsCodeTimerRef)
  stopTimer(emailCodeTimerRef)
})
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-6 sm:px-8 sm:py-8">
    <div class="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-slate-300/40 blur-3xl">
    </div>

    <div
      class="relative mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-xl backdrop-blur-md md:grid-cols-[1.05fr_1fr]">
      <section
        class="relative hidden flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-10 py-12 text-white md:flex">
        <div>
          <p class="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs tracking-wide text-white/80">Mango
            Finance</p>
          <h1 class="mt-5 text-3xl font-bold leading-tight">资金全景，一页掌控</h1>
          <p class="mt-4 max-w-sm text-sm leading-6 text-slate-200/90">
            延续你当前看板风格，登录后快速查看资产趋势、账户分布和交易节奏。
          </p>
        </div>

        <div class="space-y-3 text-sm text-slate-200/90">
          <div class="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <span class="h-2 w-2 rounded-full bg-emerald-300"></span>
            卡片化布局与仪表盘风格一致
          </div>
          <div class="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2">
            <span class="h-2 w-2 rounded-full bg-sky-300"></span>
            支持邮箱注册与短信验证码流程
          </div>
        </div>
      </section>

      <section class="p-6 sm:p-10 md:p-12">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-slate-800">{{ modeTitle }}</h2>
          <p class="mt-2 text-sm text-slate-500">{{ modeSubtitle }}</p>
        </div>

        <div class="mb-6 rounded-2xl bg-slate-100 p-1">
          <div class="relative grid grid-cols-3">
            <div
              class="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out"
              :style="{ transform: `translateX(${modeIndex * 100}%)` }"></div>
            <button v-for="mode in modeOptions" :key="mode.key" type="button" @click="switchMode(mode.key)"
              class="relative z-10 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:text-sm"
              :class="activeMode === mode.key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'">
              {{ mode.label }}
            </button>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="relative min-h-[320px] overflow-hidden sm:min-h-[340px]">
            <Transition :name="transitionName" mode="out-in">
              <div :key="activeMode" class="space-y-4">
                <template v-if="activeMode === 'emailLogin'">
                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700">邮箱</label>
                    <input v-model.trim="emailLoginForm.email" type="text" class="input-base px-4 py-3"
                      placeholder="name@example.com" autocomplete="username" />
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700">密码</label>
                    <input v-model="emailLoginForm.password" type="password" class="input-base px-4 py-3"
                      placeholder="请输入密码" autocomplete="current-password" />
                  </div>

                  <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                    <input v-model="emailLoginForm.remember" type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                    记住登录状态
                  </label>

                  <p v-if="errorMsg" class="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-500">
                    {{ errorMsg }}
                  </p>
                </template>

                <template v-else-if="activeMode === 'smsLogin'">
                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700">手机号</label>
                    <input v-model.trim="smsLoginForm.phone" type="tel" class="input-base px-4 py-3"
                      placeholder="请输入 11 位手机号" autocomplete="tel" />
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700">短信验证码</label>
                    <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input v-model.trim="smsLoginForm.code" type="text" maxlength="6" class="input-base px-4 py-3"
                        placeholder="请输入验证码" />
                      <button type="button" @click="sendSmsCode" :disabled="smsCodeCountdown > 0"
                        class="button-base justify-center px-4 py-3 text-sm sm:min-w-[120px]"
                        :class="smsCodeCountdown > 0 ? 'cursor-not-allowed opacity-60' : ''">
                        {{ smsCodeCountdown > 0 ? `${smsCodeCountdown}s` : '发送验证码' }}
                      </button>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700">注册邮箱</label>
                    <input v-model.trim="emailRegisterForm.email" type="email" class="input-base px-4 py-3"
                      placeholder="name@example.com" autocomplete="email" />
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700">邮箱验证码</label>
                    <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input v-model.trim="emailRegisterForm.code" type="text" maxlength="6"
                        class="input-base px-4 py-3" placeholder="请输入验证码" />
                      <button type="button" @click="sendEmailCode" :disabled="emailCodeCountdown > 0"
                        class="button-base justify-center px-4 py-3 text-sm sm:min-w-[120px]"
                        :class="emailCodeCountdown > 0 ? 'cursor-not-allowed opacity-60' : ''">
                        {{ emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : '发送验证码' }}
                      </button>
                    </div>
                  </div>

                  <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="mb-2 block text-sm font-medium text-slate-700">设置密码</label>
                      <input v-model="emailRegisterForm.password" type="password" class="input-base px-4 py-3"
                        placeholder="至少 6 位" autocomplete="new-password" />
                    </div>
                    <div>
                      <label class="mb-2 block text-sm font-medium text-slate-700">确认密码</label>
                      <input v-model="emailRegisterForm.confirmPassword" type="password" class="input-base px-4 py-3"
                        placeholder="再次输入密码" autocomplete="new-password" />
                    </div>
                  </div>

                  <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                    <input v-model="emailRegisterForm.agree" type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                    我已阅读并同意《用户协议》与《隐私政策》
                  </label>
                </template>
              </div>
            </Transition>
          </div>

          <button type="submit"
            class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="loading">
            {{ loading ? '处理中...' : submitLabel }}
          </button>

          <p class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            当前为页面演示版：短信登录和邮箱注册接口尚未接入。
          </p>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mode-slide-next-enter-active,
.mode-slide-next-leave-active,
.mode-slide-prev-enter-active,
.mode-slide-prev-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.mode-slide-next-enter-from,
.mode-slide-prev-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.mode-slide-next-leave-to,
.mode-slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}
</style>
