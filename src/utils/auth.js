import { AUTH_ENDPOINTS } from "@/config/Config";
import api from "@/utils/api";

export function sendEmailRegisterCode(email) {
  return api.post(AUTH_ENDPOINTS.emailCode, { email: String(email ?? "").trim() });
}

export function registerByEmail({ email, code, password }) {
  return api.post(AUTH_ENDPOINTS.emailRegister, {
    email: String(email ?? "").trim(),
    code: String(code ?? "").trim(),
    password: String(password ?? ""),
  });
}

export function sendPasswordResetEmailCode(email) {
  return api.post(AUTH_ENDPOINTS.passwordResetCode, { email: String(email ?? "").trim() });
}

export function resetPasswordByEmail({ email, code, password }) {
  return api.post(AUTH_ENDPOINTS.passwordReset, {
    email: String(email ?? "").trim(),
    code: String(code ?? "").trim(),
    password: String(password ?? ""),
  });
}

export function updateUsername(username) {
  return api.patch("/user/profile/username/", {
    username: String(username ?? "").trim(),
  });
}

