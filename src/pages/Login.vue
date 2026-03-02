<script setup>
import { useLoginPage } from '@/composables/useLoginPage'

const {
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
  transitionName
} = useLoginPage()
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff9ee] px-4 py-6 sm:px-8 sm:py-8">
    <div class="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#ffe8b3]/45 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#fff2d1]/55 blur-3xl">
    </div>

    <div
      class="relative mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-[#f3e3be]/80 bg-[#fffdf8]/92 shadow-[0_28px_60px_rgba(161,110,9,0.14)] backdrop-blur-md md:grid-cols-[1.05fr_1fr]">
      <section
        class="relative hidden flex-col justify-center bg-gradient-to-br from-[#fff8df] via-[#fff1cf] to-[#ffe6b6] px-10 py-12 text-[#4a3200] md:flex">
        <div>
          <p
            class="inline-flex rounded-full border border-[#c38a2e]/30 bg-white/45 px-4 py-1.5 text-lg font-extrabold tracking-[0.08em] text-[#6a4600] shadow-[0_6px_18px_rgba(161,110,9,0.12)]">
            Mango Finance
          </p>
          <h1 class="mt-5 max-w-md text-4xl font-bold leading-tight text-[#553300]">资金全景，一页掌控</h1>
        </div>
      </section>

      <section class="bg-[#fffefb]/82 p-6 sm:p-10 md:p-12">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-[#3f2a04]">{{ modeTitle }}</h2>
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
                    <label class="mb-2 block text-sm font-medium text-slate-700">邮箱或用户名</label>
                    <input v-model.trim="emailLoginForm.email" type="text" class="input-base px-4 py-3"
                      placeholder="请输入邮箱或用户名" autocomplete="username" />
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
                      <button type="button" @click="sendEmailCode"
                        :disabled="emailCodeCountdown > 0 || emailCodeSending"
                        class="button-base justify-center px-4 py-3 text-sm sm:min-w-[120px]"
                        :class="emailCodeCountdown > 0 || emailCodeSending ? 'cursor-not-allowed opacity-60' : ''">
                        {{ emailCodeSending ? '发送中...' : emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : '发送验证码' }}
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
