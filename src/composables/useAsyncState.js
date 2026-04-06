import { ref } from "vue";

/**
 * 封装 Store 中常见的异步请求模式：
 * - loading / error 状态管理
 * - 并发请求复用（同一时间只发一个请求）
 * - 已拉取标记（fetched）
 *
 * 用法：
 *   const { loading, error, fetched, run } = useAsyncState();
 *   async function fetchData({ force = false } = {}) {
 *     return run({ force, fetched, cached: () => data.value }, async () => {
 *       const res = await api.get(...);
 *       data.value = res.data;
 *       return data.value;
 *     });
 *   }
 */
export function useAsyncState() {
  const loading = ref(false);
  const error = ref(null);
  const fetched = ref(false);
  const promise = ref(null);

  /**
   * 执行一次异步任务，自动管理 loading/error/promise 状态。
   * @param {object} options
   * @param {boolean} [options.force=false]      - 是否跳过缓存强制重新请求
   * @param {boolean} [options.silent=false]     - 静默模式下不更新 loading/error
   * @param {Function} [options.getCached]       - 返回缓存值的函数，force=false 且 fetched=true 时使用
   * @param {Function} task                      - 实际执行的异步函数
   */
  async function run({ force = false, silent = false, getCached } = {}, task) {
    if (promise.value) return promise.value;
    if (!force && fetched.value && getCached) return getCached();

    if (!silent) {
      loading.value = true;
      error.value = null;
    }

    const p = (async () => {
      try {
        const result = await task();
        fetched.value = true;
        return result;
      } catch (e) {
        if (!silent) error.value = e;
        throw e;
      } finally {
        if (!silent) loading.value = false;
        promise.value = null;
      }
    })();

    promise.value = p;
    return p;
  }

  function reset() {
    loading.value = false;
    error.value = null;
    fetched.value = false;
    promise.value = null;
  }

  return { loading, error, fetched, promise, run, reset };
}
