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

export function getActivityTypeByMode(mode) {
  return ACTIVITY_TYPE_BY_MODE[mode] ?? ACTIVITY_TYPE_BY_MODE[TRANSACTION_HISTORY_MODE.ACTIVITY];
}

export function getTransactionsByMode(mode, params) {
  return api.get(`${BASE_URL}/`, {
    params: {
      ...params,
      activity_type: getActivityTypeByMode(mode),
    },
  });
}

export function createTransaction(data) {
  return api.post(`${BASE_URL}/`, data);
}

export function reverseTransaction(id) {
  return api.post(`${BASE_URL}/${id}/reverse/`);
}

export function deleteTransactionByMode(id) {
  return api.post(DELETE_URL, {
    mode: "single",
    transaction_id: id,
  });
}

export function deleteAllTransactionsByActivity(activityType) {
  return api.post(DELETE_URL, {
    mode: "activity",
    activity_type: activityType,
  });
}
