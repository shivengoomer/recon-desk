"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; invite_code: string }) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) return setReady(true);
    api<User>("/api/auth/me").then(setUser).catch(() => tokenStore.clear()).finally(() => setReady(true));
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    location.assign("/login");
  }, []);

  // Sign out automatically when the 7-day session ends, and when another tab signs out.
  useEffect(() => {
    if (!user) return;
    const exp = tokenStore.expiresAt();
    const timer = exp ? setTimeout(() => logout(), Math.max(0, exp - Date.now())) : undefined;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "recon.token" && !e.newValue) {
        setUser(null);
        location.assign("/login");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; user: User }>("/api/auth/login", { json: { email, password } });
    tokenStore.set(res.access_token);
    setUser(res.user);
  }, []);
  const register = useCallback(async (input: { name: string; email: string; password: string; invite_code: string }) => {
    const res = await api<{ access_token: string; user: User }>("/api/auth/register", { json: input });
    tokenStore.set(res.access_token);
    setUser(res.user);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
