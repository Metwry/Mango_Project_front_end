import api from "@/utils/api.js";

const BASE_URL = "/user/accounts";
const INVESTMENT_ACCOUNT_NAME = "投资账户";
const INVESTMENT_ACCOUNT_TYPE = "investment";

// 获取当前用户的账户列表。
export function getAccounts() {
  return api.get(`${BASE_URL}/`);
}

// 创建一个新的账户。
export function createAccount(data) {
  return api.post(`${BASE_URL}/`, data);
}

// 获取指定账户的详情信息。
export function getAccountDetail(id) {
  return api.get(`${BASE_URL}/${id}/`);
}

// 更新指定账户的信息。
export function updateAccount(id, data) {
  return api.patch(`${BASE_URL}/${id}/`, data);
}

// 删除指定账户。
export function deleteAccount(id) {
  return api.delete(`${BASE_URL}/${id}/`);
}

// 判断一个账户是否为系统中的投资账户。
export function isInvestmentAccount(account) {
  if (!account || typeof account !== "object") return false;
  return account.name === INVESTMENT_ACCOUNT_NAME && account.type === INVESTMENT_ACCOUNT_TYPE;
}

// 过滤掉账户列表中的投资账户。
export function filterNonInvestmentAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((account) => !isInvestmentAccount(account));
}
