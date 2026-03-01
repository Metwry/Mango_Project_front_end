import api from "@/utils/api.js";

const BASE_URL = "/investment";
const MARKET_BASE_URL = "/user/markets";

export function getInvestmentPositions(params) {
  return api.get(`${BASE_URL}/positions/`, { params });
}

export function getLatestMarketQuotes(data) {
  return api.post(`${MARKET_BASE_URL}/quotes/latest/`, data);
}
