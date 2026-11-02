const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "recon.token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, t);
    } catch {}
  },
  clear: () => {
    try {
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
    throw new ApiError(0, "Cannot reach the server. Check your connection and try again.");
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
