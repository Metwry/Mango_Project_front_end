import api from "@/utils/api.js";

const BASE_URL = "/user/markets";

// 获取当前用户的市场自选列表和行情数据。
export function getUserMarkets() {
  return api.get(`${BASE_URL}/`);
}

// 按关键词搜索可加入自选的市场标的。
export function searchMarketInstruments(keyword, limit = 20) {
  return api.get(`${BASE_URL}/search/`, {
    params: { q: keyword, limit },
  });
}

// 将指定标的加入自选列表。
export function addWatchlistInstrument(symbol) {
  return api.post(`${BASE_URL}/watchlist/`, { symbol });
}

// 从自选列表中删除指定标的。
export function deleteWatchlistInstrument(payload) {
  return api.delete(`${BASE_URL}/watchlist/`, { data: payload });
}
