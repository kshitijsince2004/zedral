import { env } from "@/app/env";

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

// ─── apiFetch ─────────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = env.VITE_API_BASE_URL + path;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

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
