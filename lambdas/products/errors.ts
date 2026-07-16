import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiErrorCode } from "@serfel/shared";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: ContentfulStatusCode,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** mysql2 network-level failures — the dev DB is stopped or unreachable. */
export function isDbUnreachable(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return (
    typeof code === "string" &&
    ["ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST"].includes(code)
  );
}
