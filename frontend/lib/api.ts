const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "recon.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// The session lives 7 days from sign-in and survives closing the tab (localStorage).
// Expiry is enforced here as well as by the server's token lifetime.
export const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

interface StoredSession {
  token: string;
  expiresAt: number;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (typeof s.token !== "string" || typeof s.expiresAt !== "number" || Date.now() >= s.expiresAt) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export const tokenStore = {
  get: (): string | null => readSession()?.token ?? null,
  expiresAt: (): number | null => readSession()?.expiresAt ?? null,
  set: (t: string) => {
    try {
      const s: StoredSession = { token: t, expiresAt: Date.now() + SESSION_MS };
      localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
    } catch {}
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

function detailMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d) => `${(d.loc ?? []).filter((x: string) => x !== "body").join(".")}: ${d.msg}`).join("; ");
  return "Something went wrong";
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("server-offline", { detail: { reason: "network_error" } }));
    }
    throw new ApiError(0, "Cannot reach the server. The server might be sleeping.");
  }
  if (res.status >= 502 && res.status <= 504) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("server-offline", { detail: { reason: "gateway_down", status: res.status } }));
    }
  }
  if (res.status === 401 && !path.startsWith("/api/auth/login")) {
    tokenStore.clear();
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) location.assign("/login");
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = detailMessage((await res.json()).detail);
    } catch {}
    throw new ApiError(res.status, msg);
  }
  return res;
}

export async function api<T>(path: string, init?: { method?: string; json?: unknown; form?: FormData }): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  } else if (init?.form) body = init.form;
  const res = await request(path, { method: init?.method ?? (body ? "POST" : "GET"), headers, body });
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export async function download(path: string, fallbackName: string): Promise<void> {
  const res = await request(path);
  const name = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const qs = (p: Record<string, string | number | boolean | string[] | undefined | null>): string => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => u.append(k, x));
    else u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
};
