import api from "@/utils/api.js";

const BASE_URL = "/user/transactions";

export const TRANSACTION_HISTORY_MODE = Object.freeze({
  ACTIVITY: "activity",
  ALL: "all",
  TRANSFER: "transfer",
  REVERSED: "reversed",
});

const SOURCE_BY_MODE = Object.freeze({
  [TRANSACTION_HISTORY_MODE.ACTIVITY]: "manual",
  [TRANSACTION_HISTORY_MODE.ALL]: "investment",
  [TRANSACTION_HISTORY_MODE.TRANSFER]: "transfer",
  [TRANSACTION_HISTORY_MODE.REVERSED]: "reversal",
});

// 根据历史记录模式返回接口所需的 source 参数。
export function getSourceByMode(mode) {
  return SOURCE_BY_MODE[mode];
}

// 按指定历史模式查询交易列表。
export function getTransactionsByMode(mode, params) {
  return api.get(`${BASE_URL}/`, {
    params: {
      ...params,
      source: getSourceByMode(mode),
    },
  });
}

// 创建一条新的交易记录。
export function createTransaction(data) {
  return api.post(`${BASE_URL}/`, data);
}

// 撤销指定交易记录。
export function reverseTransaction(id) {
  return api.post(`${BASE_URL}/${id}/reverse/`);
}

// 按 id 或 source 统一删除交易记录。
export function deleteTransactions(params) {
  return api.delete(`${BASE_URL}/delete/`, { params });
}
