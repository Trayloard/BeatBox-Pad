export type AuthTokenGetter = () => string | Promise<string | null | undefined> | null | undefined;

let baseUrl = "";
let authTokenGetter: AuthTokenGetter | undefined;

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/$/, "");
}

export function setAuthTokenGetter(getter: AuthTokenGetter | undefined): void {
  authTokenGetter = getter;
}

export type CustomFetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
};

export async function customFetch<T>(
  path: string,
  options: CustomFetchOptions = {},
): Promise<T> {
  const { params, headers, ...rest } = options;
  const url = new URL(
    path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
    typeof window === "undefined" ? "http://localhost" : window.location.origin,
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  const requestHeaders = new Headers(headers);
  const token = authTokenGetter ? await authTokenGetter() : undefined;
  if (token) {
    requestHeaders.set("Authorization", "Bearer " + token);
  }

  const response = await fetch(url.toString(), {
    ...rest,
    headers: requestHeaders,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (response.headers.get("content-type")?.toLowerCase().includes("text/event-stream")) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}
