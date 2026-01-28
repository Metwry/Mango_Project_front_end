// 请根据你的实际文件路径修改，比如 '@/utils/request'
import api from "@/utils/api.js";

// 2. 定义接口路径（建议提取公共前缀，方便维护）
const BASE_URL = "/user/accounts";

/**
 * 获取账户列表
 * GET /api/accounts/
 */
export function getAccounts() {
  return api.get(`${BASE_URL}/`);
}

/**
 * 创建新账户
 * POST /api/accounts/
 * @param {Object} data - 表单数据
 */
export function createAccount(data) {
  return api.post(`${BASE_URL}/`, data); // POST 请求的数据直接作为第二个参数
}

/**
 * 获取单个账户详情
 * GET /api/accounts/{id}/
 * @param {Number|String} id - 账户ID
 */
export function getAccountDetail(id) {
  return api.get(`${BASE_URL}/${id}/`);
}

/**
 * 更新账户信息
 * PUT /api/accounts/{id}/
 * @param {Number|String} id
 * @param {Object} data
 */
export function updateAccount(id, data) {
  return api.put(`${BASE_URL}/${id}/`, data);
}

/**
 * 删除账户
 * DELETE /api/accounts/{id}/
 * @param {Number|String} id
 */
export function deleteAccount(id) {
  return api.delete(`${BASE_URL}/${id}/`);
}
