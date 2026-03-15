import api from "@/utils/api.js";

const BASE_URL = "/user/transfers";

// 创建一笔账户间转账记录。
export function createTransfer(payload) {
  return api.post(`${BASE_URL}/`, payload);
}
