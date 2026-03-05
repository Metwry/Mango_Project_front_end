import api from "@/utils/api.js";

const BASE_URL = "/investment";
const MARKET_BASE_URL = "/user/markets";
const DEFAULT_BUY_ENDPOINT = `${BASE_URL}/buy/`;
const DEFAULT_SELL_ENDPOINT = `${BASE_URL}/sell/`;

const BUY_ENDPOINT =
  import.meta.env.VITE_INVESTMENT_BUY_ENDPOINT ?? DEFAULT_BUY_ENDPOINT;
const SELL_ENDPOINT =
  import.meta.env.VITE_INVESTMENT_SELL_ENDPOINT ?? DEFAULT_SELL_ENDPOINT;

export function getInvestmentPositions(params) {
  return api.get(`${BASE_URL}/positions/`, { params });
}

export function getLatestMarketQuotes(data) {
  return api.post(`${MARKET_BASE_URL}/quotes/latest/`, data);
}

export function buyInvestmentPosition(data) {
  return api.post(BUY_ENDPOINT, data);
}

export function sellInvestmentPosition(data) {
  return api.post(SELL_ENDPOINT, data);
}
