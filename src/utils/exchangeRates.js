import api from "@/utils/api.js";

const DEFAULT_USD_RATES_ENDPOINT = "/user/markets/fx-rates/";
const USD_RATES_ENDPOINT =
  import.meta.env.VITE_USD_RATES_ENDPOINT ?? DEFAULT_USD_RATES_ENDPOINT;

export function getUsdExchangeRates() {
  return api.get(USD_RATES_ENDPOINT, {
    params: { base: "USD" },
  });
}
