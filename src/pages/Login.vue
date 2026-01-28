<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const showPassword = ref(false)
const loading = ref(false)

const email = ref('')
const password = ref('')
const errorMsg = ref('')


async function handleLogin() {
  errorMsg.value = ''

  if (!email.value || !password.value) {
    errorMsg.value = '邮箱和密码不能为空'
    return
  }

  loading.value = true
  try {
    await auth.login(email.value, password.value)
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
</script>

<template>
  <div class="login-page">

    <!-- 登录容器 -->
    <div class="login-container">
      <!-- 登录卡片 -->
      <section class="login-card">
        <h1 class="login-title">用户登录</h1>
        <p class="login-subtitle">请输入您的登录信息</p>
        <!-- 邮箱输入框 -->
        <div class="login-field">
          <label class="login-label">邮箱</label>
          <el-input v-model="email" class="login-input" placeholder="请输入邮箱" clearable @keydown.space.prevent />
        </div>
        <!-- 密码输入框 -->
        <div class="login-field">
          <label class="login-label">密码</label>
          <div class="password-wrapper">
            <el-input v-model="password" class="login-input" :type="showPassword ? 'text' : 'password'" clearable
              placeholder="请输入密码" maxlength="20" show-password @keydown.space.prevent @keydown.enter="handleLogin" />
          </div>
        </div>
        <!-- 记住账号 忘记密码 -->
        <div class="login-extra">
          <label class="remember-me">
            <input type="checkbox" />
            <span>记住账号</span>
          </label>
          <button type="button" class="link-button">忘记密码？</button>
        </div>
        <!-- 登录按钮 -->
        <p v-if="errorMsg" style="color: red; margin-bottom: 8px;">
          {{ errorMsg }}
        </p>
        <button type="button" class="login-button" @click="handleLogin">登录</button>

        <div class="register-tip">
          还没有账号？
          <button type="button" class="link-button">立即注册</button>
        </div>
      </section>

      <!-- logo -->
      <section class="login-illustration" aria-hidden="true">
        <div class="smile-face">
          <div class="eye eye-left"></div>
          <div class="eye eye-right"></div>
          <div class="smile"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background: #020617; */
  padding: 24px;
  box-sizing: border-box;
  background: rgba(241, 245, 249, 0.6);
  /* 半透明底色 */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: url('/src/assets/bg.jpg') center/cover fixed no-repeat;
}

.checkbox {
  cursor: pointer;
}

.login-container {
  display: flex;
  width: 1400px;
  max-width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.login-card {
  width: 600px;
  max-width: 100%;
  height: 500px;
  border-radius: 32px;
  padding: 36px 40px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
  text-align: center;
  user-select: none;
}

.login-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 32px;
  margin-top: 20px;
  text-align: center;
  user-select: none;
}

.login-field {
  margin-bottom: 16px;
}

.login-label {
  display: block;
  font-size: 14px;
  color: #475569;
  margin-bottom: 10px;
  margin-left: 12px;
  user-select: none;
}

.password-wrapper {
  position: relative;
}

.login-input :deep(.el-input__wrapper) {
  width: 100%;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 10px 40px 10px 16px;
  font-size: 14px;
  outline: none;
  transition: border 0.2s, background 0.2s;
  box-sizing: border-box;
  user-select: none;
}

.login-input:focus {
  border-color: #0f172a;
  background: #fff;
}

.password-toggle {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 14px;
  color: #94a3b8;
  cursor: pointer;
}

.remember-me {
  font-size: 15px;
  display: flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.login-extra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 12px;
  color: #64748b;
}


.remember-me input {
  width: 12px;
  height: 12px;
}

.remember-me:hover {
  color: #0f172a;
}

.link-button {
  font-size: 15px;
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  padding: 0;
  user-select: none;
}

.link-button:hover {
  color: #0f172a;
}

.login-button {
  width: 100%;
  border: none;
  border-radius: 999px;
  background: #020617;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 16px;
  cursor: pointer;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35);
  transition: background 0.2s;
  user-select: none;
}

.login-button:hover {
  background: #000;
}

.register-tip {
  margin-top: 28px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  user-select: none;
}

.login-illustration {
  display: none;
  flex: 1;
  justify-content: center;
}

.smile-face {
  position: relative;
  width: 256px;
  height: 256px;
  border-radius: 50%;
  background: #2563eb;
  box-shadow: 0 30px 80px rgba(37, 99, 235, 0.5);
}

.eye {
  position: absolute;
  top: 80px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
}

.eye-left {
  left: 80px;
}

.eye-right {
  right: 80px;
}

.smile {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 48px;
  border-bottom-left-radius: 120px;
  border-bottom-right-radius: 120px;
  background: #020617;
}


/* 只有当屏幕宽度大于或等于 768 像素（通常是平板或电脑）时，才显示那个右边的蓝色笑脸插图 */
@media (min-width: 768px) {
  .login-illustration {
    display: flex;
  }
}
</style>
