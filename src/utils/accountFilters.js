const INVESTMENT_ACCOUNT_KEYWORDS = [
  "investment",
  "invest",
  "stock",
  "securities",
  "security",
  "fund",
  "equity",
  "portfolio",
  "投资",
  "股票",
  "证券",
  "基金",
  "理财",
];

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function containsInvestmentKeyword(text) {
  if (!text) return false;
  return INVESTMENT_ACCOUNT_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function isInvestmentAccount(account) {
  const typeText = normalizeText(account?.type);
  const nameText = normalizeText(account?.name);
  return containsInvestmentKeyword(typeText) || containsInvestmentKeyword(nameText);
}

export function filterNonInvestmentAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((account) => !isInvestmentAccount(account));
}
