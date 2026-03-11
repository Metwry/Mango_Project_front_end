import api from "@/utils/api.js";

const BASE_URL = "/user/markets";

export function getUserMarkets() {
  return api.get(`${BASE_URL}/`);
}

export function searchMarketInstruments(keyword, limit = 20) {
  return api.get(`${BASE_URL}/search/`, {
    params: { q: keyword, limit },
  });
}

export function addWatchlistInstrument(symbol) {
  return api.post(`${BASE_URL}/watchlist/`, { symbol });
}

export function deleteWatchlistInstrument(payload) {
  return api.delete(`${BASE_URL}/watchlist/`, { data: payload });
}
