/**
 * Remove a leading `/coproad` path segment so a tenant-suffixed request
 * (`/coproad/sales/...`) matches the Express apps mounted at `/sales/`,
 * `/orders/`. Non-matching paths pass through untouched.
 */
export function stripCoproadPrefix(path: string): string {
  if (path === "/coproad" || path === "/coproad/") return "/";
  if (path.startsWith("/coproad/")) return path.slice("/coproad".length);
  return path;
}
