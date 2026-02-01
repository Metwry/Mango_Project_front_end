import api from "@/utils/api.js";

const BASE_URL = "/user/transactions";

export function getTransactions(params) {
  // params 可选：用于分页/筛选/排序等，例如 { account_id, category, start, end, page }
  return api.get(`${BASE_URL}/`, { params });
}

export function createTransaction(data) {
  return api.post(`${BASE_URL}/`, data);
}

export function getTransactionDetail(id) {
  return api.get(`${BASE_URL}/${id}/`);
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
