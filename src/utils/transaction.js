import api from "@/utils/api.js";

const BASE_URL = "/user/transactions";
const DELETE_URL = `${BASE_URL}/delete/`;

export const TRANSACTION_HISTORY_MODE = Object.freeze({
  ACTIVITY: "activity",
  ALL: "all",
  TRANSFER: "transfer",
  REVERSED: "reversed",
});

const ACTIVITY_TYPE_BY_MODE = Object.freeze({
  [TRANSACTION_HISTORY_MODE.ACTIVITY]: "manual",
  [TRANSACTION_HISTORY_MODE.ALL]: "investment",
  [TRANSACTION_HISTORY_MODE.TRANSFER]: "transfer",
  [TRANSACTION_HISTORY_MODE.REVERSED]: "reversed",
});

// 根据历史记录模式返回对应的活动类型参数。
export function getActivityTypeByMode(mode) {
  return ACTIVITY_TYPE_BY_MODE[mode] ?? ACTIVITY_TYPE_BY_MODE[TRANSACTION_HISTORY_MODE.ACTIVITY];
}

// 按指定历史模式查询交易列表。
export function getTransactionsByMode(mode, params) {
  return api.get(`${BASE_URL}/`, {
    params: {
      ...params,
      activity_type: getActivityTypeByMode(mode),
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

// 删除单条交易记录。
export function deleteTransactionByMode(id) {
  return api.post(DELETE_URL, {
    mode: "single",
    transaction_id: id,
  });
}

// 按活动类型批量删除交易记录。
export function deleteAllTransactionsByActivity(activityType) {
  return api.post(DELETE_URL, {
    mode: "activity",
    activity_type: activityType,
  });
}
