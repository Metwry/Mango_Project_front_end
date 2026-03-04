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

export function isInvestmentAccount(account) {
  if (!account || typeof account !== "object") return false;

  // 优先使用后端显式字段，避免前端关键词误判
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

  // 兼容少量历史名称标识，避免把“Stock/证券/基金”等普通文本误杀
  const nameText = normalizeText(account?.name);
  return nameText.includes("投资账户") || nameText.includes("investment account");
}

export function filterNonInvestmentAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((account) => !isInvestmentAccount(account));
}
