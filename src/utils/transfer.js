import api from "@/utils/api.js";

const BASE_URL = "/user/transfers";

export function createTransfer(payload) {
  return api.post(`${BASE_URL}/`, payload);
}
