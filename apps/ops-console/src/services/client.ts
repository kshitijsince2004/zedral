import { env } from "@/app/env";
import { authModule } from "@/lib/keycloak";

// ─── ApiError ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, message: string, path: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHeaders(init?: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (!env.VITE_USE_MOCK) {
    const token = authModule.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

// ─── apiFetch ─────────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = env.VITE_API_BASE_URL + path;

  const response = await fetch(url, {
    ...init,
    headers: buildHeaders(init),
  });

  // On 401 in live mode: attempt token refresh and retry once
  if (response.status === 401 && !env.VITE_USE_MOCK) {
    const refreshed = await authModule.refreshToken();

    if (refreshed) {
      const retryResponse = await fetch(url, {
        ...init,
        headers: buildHeaders(init),
      });

      if (!retryResponse.ok) {
        const message = await retryResponse.text().catch(() => retryResponse.statusText);
        throw new ApiError(retryResponse.status, message, path);
      }

      return retryResponse.json() as Promise<T>;
    }

    await authModule.login();
    throw new ApiError(401, "Session expired", path);
  }

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new ApiError(response.status, message, path);
  }

  return response.json() as Promise<T>;
}

// ─── createEventSource ────────────────────────────────────────────────────────

export function createEventSource(
  path: string,
  onMessage: (data: unknown) => void
): () => void {
  const url = env.VITE_API_BASE_URL + path;
  const source = new EventSource(url);

  source.onmessage = (event: MessageEvent) => {
    try {
      const data: unknown = JSON.parse(event.data as string);
      onMessage(data);
    } catch {
      // Ignore malformed JSON frames
    }
  };

  return () => {
    source.close();
  };
}
