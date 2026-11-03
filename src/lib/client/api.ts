/**
 * Small fetch wrapper for the app's own API. Every failure becomes an
 * ApiRequestError with a message that is safe to show to the user.
 */

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export async function apiRequest<T>(method: Method, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiRequestError(0, "Could not reach the server. Check your connection and try again.");
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : res.status === 401
          ? "Your session has ended. Please sign in again."
          : `The request failed (error ${res.status}). Please try again.`;
    throw new ApiRequestError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>("GET", path, undefined, signal),
  post: <T>(path: string, body?: unknown) => apiRequest<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => apiRequest<T>("PATCH", path, body),
  delete: <T>(path: string, body?: unknown) => apiRequest<T>("DELETE", path, body),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
