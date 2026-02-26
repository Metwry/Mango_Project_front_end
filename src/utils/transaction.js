import api from "@/utils/api.js";

const BASE_URL = "/user/transactions";

export function getTransactions(params) {
  // params 可选：用于分页/筛选/排序等，例如 { account_id, category, start, end, page }
  // 搜索交易记录功能添加：account_name、counterparty、category、start、end 等筛选字段（后端接口待支持）
  return api.get(`${BASE_URL}/`, { params });
}

export function createTransaction(data) {
  return api.post(`${BASE_URL}/`, data);
}

export function updateTransaction(id, data) {
  return api.put(`${BASE_URL}/${id}/`, data);
}

export function deleteTransaction(id) {
  return api.delete(`${BASE_URL}/${id}/`);
}

export function patchTransaction(id, data) {
  return api.patch(`${BASE_URL}/${id}/`, data);
}

export function reverseTransaction(id) {
  return api.post(`${BASE_URL}/${id}/reverse/`);
}
