export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = readCookie("vet_csrf");
    if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  }
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await apiFetch(input, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(payload?.error ?? "Ошибка запроса", response.status);
  }
  return response.json() as Promise<T>;
}
