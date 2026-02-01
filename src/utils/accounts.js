import api from "@/utils/api.js";

const BASE_URL = "/user/accounts";

export function getAccounts() {
  return api.get(`${BASE_URL}/`);
}

export function createAccount(data) {
  return api.post(`${BASE_URL}/`, data);
}

export function getAccountDetail(id) {
  return api.get(`${BASE_URL}/${id}/`);
}

export function updateAccount(id, data) {
  return api.put(`${BASE_URL}/${id}/`, data);
}

export function deleteAccount(id) {
  return api.delete(`${BASE_URL}/${id}/`);
}
