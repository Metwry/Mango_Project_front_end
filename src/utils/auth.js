import { AUTH_ENDPOINTS } from "@/config/Config";
import api from "@/utils/api";

// 发送注册邮箱验证码。
export function sendEmailRegisterCode(email) {
  return api.post(AUTH_ENDPOINTS.emailCode, { email: String(email ?? "").trim() });
}

// 通过邮箱验证码完成账号注册。
export function registerByEmail({ email, code, password }) {
  return api.post(AUTH_ENDPOINTS.emailRegister, {
    email: String(email ?? "").trim(),
    code: String(code ?? "").trim(),
    password: String(password ?? ""),
  });
}

// 发送重置密码所需的邮箱验证码。
export function sendPasswordResetEmailCode(email) {
  return api.post(AUTH_ENDPOINTS.passwordResetCode, { email: String(email ?? "").trim() });
}

// 通过邮箱验证码重置用户密码。
export function resetPasswordByEmail({ email, code, password }) {
  return api.post(AUTH_ENDPOINTS.passwordReset, {
    email: String(email ?? "").trim(),
    code: String(code ?? "").trim(),
    password: String(password ?? ""),
  });
}

// 更新当前用户的用户名。
export function updateUsername(username) {
  return api.patch("/user/profile/username/", {
    username: String(username ?? "").trim(),
  });
}

