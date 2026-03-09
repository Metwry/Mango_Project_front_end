import api from "@/utils/api.js";

const BASE_URL = "/user/accounts";
const INVESTMENT_TYPE_VALUES = new Set([
  "investment",
  "invest",
  "investment_account",
  "investmentaccount",
  "portfolio",
  "投资",
  "投资账户",
]);

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isTrueFlag(value) {
  return value === true || value === 1 || value === "1";
}

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

  if (
    isTrueFlag(account?.is_investment) ||
    isTrueFlag(account?.isInvestment) ||
    isTrueFlag(account?.is_investment_account) ||
    isTrueFlag(account?.isInvestmentAccount)
  ) {
    return true;
  }

  const typeText = normalizeText(account?.type ?? account?.account_type ?? account?.accountType);
  if (typeText && INVESTMENT_TYPE_VALUES.has(typeText)) return true;

  const nameText = normalizeText(account?.name);
  return nameText.includes("投资账户") || nameText.includes("investment account");
}

export function filterNonInvestmentAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((account) => !isInvestmentAccount(account));
}
