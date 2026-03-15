// 规范化路由路径，统一去掉尾部斜杠。
export function normalizeRoutePath(path = "") {
  return String(path).replace(/\/+$/, "") || "/";
}
