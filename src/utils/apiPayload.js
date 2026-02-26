export function getPayload(response, fallback = null) {
  return response?.data ?? response ?? fallback;
}

export function getResultsList(response, fallback = []) {
  const payload = getPayload(response, null);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return fallback;
}

export function getPagedList(response) {
  const payload = getPayload(response, null);
  if (payload && Array.isArray(payload.results)) {
    return {
      list: payload.results,
      total: payload.count ?? payload.results.length,
    };
  }
  if (Array.isArray(payload)) {
    return {
      list: payload,
      total: payload.length,
    };
  }
  return { list: [], total: 0 };
}
