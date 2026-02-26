<script setup>
import { useLoginPage } from '@/composables/useLoginPage'

const {
  activeMode,
  emailCodeCountdown,
  emailLoginForm,
  emailRegisterForm,
  errorMsg,
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

