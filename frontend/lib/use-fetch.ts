"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export function useFetch<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);

  const run = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    loadRef.current()
      .then((d) => seq.current === id && setData(d))
      .catch((e) => seq.current === id && setError(e instanceof ApiError ? e.message : "Something went wrong"))
      .finally(() => seq.current === id && setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, deps);
  return { data, error, loading, reload: run, setData };
}
