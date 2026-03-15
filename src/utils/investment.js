import { INVESTMENT_ENDPOINTS } from "@/config/Config";
import api from "@/utils/api.js";

const BASE_URL = "/investment";
const MARKET_BASE_URL = "/user/markets";

// 获取当前用户的投资持仓列表。
export function getInvestmentPositions(params) {
  return api.get(`${BASE_URL}/positions/`, { params });
}

// 获取一组标的的最新行情报价。
export function getLatestMarketQuotes(data) {
  return api.post(`${MARKET_BASE_URL}/quotes/latest/`, data);
}

// 提交一笔买入交易。
export function buyInvestmentPosition(data) {
  return api.post(INVESTMENT_ENDPOINTS.buy, data);
}

// 提交一笔卖出交易。
export function sellInvestmentPosition(data) {
  return api.post(INVESTMENT_ENDPOINTS.sell, data);
}

