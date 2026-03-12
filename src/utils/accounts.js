import api from "@/utils/api.js";

const BASE_URL = "/user/accounts";
const INVESTMENT_ACCOUNT_NAME = "投资账户";
const INVESTMENT_ACCOUNT_TYPE = "investment";

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
  return api.patch(`${BASE_URL}/${id}/`, data);
}

export function deleteAccount(id) {
  return api.delete(`${BASE_URL}/${id}/`);
}

export function isInvestmentAccount(account) {
  if (!account || typeof account !== "object") return false;
  return account.name === INVESTMENT_ACCOUNT_NAME && account.type === INVESTMENT_ACCOUNT_TYPE;
}

export function filterNonInvestmentAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((account) => !isInvestmentAccount(account));
}
