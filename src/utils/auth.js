import api from "@/utils/api";

const DEFAULT_EMAIL_CODE_ENDPOINT = "/register/email/code/";
const DEFAULT_EMAIL_REGISTER_ENDPOINT = "/register/email/";

const EMAIL_CODE_ENDPOINT =
  import.meta.env.VITE_AUTH_EMAIL_CODE_ENDPOINT ?? DEFAULT_EMAIL_CODE_ENDPOINT;
const EMAIL_REGISTER_ENDPOINT =
  import.meta.env.VITE_AUTH_EMAIL_REGISTER_ENDPOINT ?? DEFAULT_EMAIL_REGISTER_ENDPOINT;

export function sendEmailRegisterCode(email) {
  return api.post(EMAIL_CODE_ENDPOINT, { email: String(email ?? "").trim() });
}

export function registerByEmail({ email, code, password, confirmPassword }) {
  return api.post(EMAIL_REGISTER_ENDPOINT, {
    email: String(email ?? "").trim(),
    code: String(code ?? "").trim(),
    password: String(password ?? ""),
    confirm_password: String(confirmPassword ?? ""),
  });
}
