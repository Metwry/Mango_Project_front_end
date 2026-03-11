import { INVESTMENT_ENDPOINTS } from "@/config/Config";
import api from "@/utils/api.js";

const BASE_URL = "/investment";
const MARKET_BASE_URL = "/user/markets";

export function getInvestmentPositions(params) {
  return api.get(`${BASE_URL}/positions/`, { params });
}

export function getLatestMarketQuotes(data) {
  return api.post(`${MARKET_BASE_URL}/quotes/latest/`, data);
}

export function buyInvestmentPosition(data) {
  return api.post(INVESTMENT_ENDPOINTS.buy, data);
}

export function sellInvestmentPosition(data) {
  return api.post(INVESTMENT_ENDPOINTS.sell, data);
}

