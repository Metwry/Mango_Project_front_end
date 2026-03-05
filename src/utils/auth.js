import api from "@/utils/api";

const DEFAULT_EMAIL_CODE_ENDPOINT = "/register/email/code/";
const DEFAULT_EMAIL_REGISTER_ENDPOINT = "/register/email/";
const DEFAULT_PASSWORD_RESET_CODE_ENDPOINT = "/password/reset/code/";
const DEFAULT_PASSWORD_RESET_ENDPOINT = "/password/reset/";

const EMAIL_CODE_ENDPOINT =
  import.meta.env.VITE_AUTH_EMAIL_CODE_ENDPOINT ?? DEFAULT_EMAIL_CODE_ENDPOINT;
const EMAIL_REGISTER_ENDPOINT =
  import.meta.env.VITE_AUTH_EMAIL_REGISTER_ENDPOINT ?? DEFAULT_EMAIL_REGISTER_ENDPOINT;
const PASSWORD_RESET_CODE_ENDPOINT =
  import.meta.env.VITE_AUTH_PASSWORD_RESET_CODE_ENDPOINT ?? DEFAULT_PASSWORD_RESET_CODE_ENDPOINT;
const PASSWORD_RESET_ENDPOINT =
  import.meta.env.VITE_AUTH_PASSWORD_RESET_ENDPOINT ?? DEFAULT_PASSWORD_RESET_ENDPOINT;

export function sendEmailRegisterCode(email) {
  return api.post(EMAIL_CODE_ENDPOINT, { email: String(email ?? "").trim() });
}

export function registerByEmail({ email, code, password }) {
  return api.post(EMAIL_REGISTER_ENDPOINT, {
    email: String(email ?? "").trim(),
    code: String(code ?? "").trim(),
    password: String(password ?? ""),
  });
}

export function sendPasswordResetEmailCode(email) {
  return api.post(PASSWORD_RESET_CODE_ENDPOINT, { email: String(email ?? "").trim() });
}

export function resetPasswordByEmail({ email, code, password }) {
  return api.post(PASSWORD_RESET_ENDPOINT, {
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
