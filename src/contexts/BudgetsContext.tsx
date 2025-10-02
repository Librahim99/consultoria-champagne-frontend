import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Budget } from '../utils/interfaces';
import { BudgetsAPI, type ListParams } from '../api/budgets';

type BudgetActionName = 'submit'|'approve'|'reject'|'send'|'accept'|'lose';

type Ctx = {
  list: Budget[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;

  /** Últimos parámetros normalizados en uso */
  params: ListParams;

  /** Solo actualiza el estado de params (no hace fetch) */
  setParams: (p: Partial<ListParams>) => void;

  /** Normaliza + hace fetch (útil cuando aplicás filtros de UI) */
  applyFilters: (p: Partial<ListParams>) => Promise<void>;

  fetch: (params?: Partial<ListParams>) => Promise<void>;
  refresh: () => Promise<void>;
  resetFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;

  /* errores */
  clearError: () => void;

  /* CRUD/acciones */
  create: (payload: Partial<Budget>) => Promise<Budget>;
  update: (id: string, payload: Partial<Budget>) => Promise<Budget>;
  action: (id: string, name: BudgetActionName, body?: any) => Promise<Budget>;
};

export const BudgetsContext = createContext<Ctx | null>(null);

/* ---------- Helpers ---------- */

const normalizeParams = (p: Partial<ListParams> = {}): ListParams => ({
  page: p.page ?? 1,
  limit: p.limit ?? 20,
  q: p.q?.trim() || undefined,
  status: p.status || undefined,
  clientName: p.clientName?.trim() || undefined,
});

const filtersChanged = (a: ListParams, b: ListParams) =>
  a.q !== b.q || a.status !== b.status || a.clientName !== b.clientName;

const matchesFilters = (b: Budget, p: ListParams) => {
  if (p.status && b.status !== p.status) return false;
  if (p.clientName) {
  const clientName = p.clientName.toLowerCase();
  const budgetClient = (b.clientName ?? "").toLowerCase();
  if (!budgetClient.includes(clientName)) return false;
}
  if (p.q) {
  const q = p.q.toLowerCase();
  const client = (b.clientName ?? "").toLowerCase();
  const notes = (b.notes ?? "").toLowerCase();
  const terms = (b.terms ?? "").toLowerCase();
  const itemsOk = (b.items ?? []).some(
    (it: any) => (it?.description ?? "").toLowerCase().includes(q)
  );
  if (!(client.includes(q) || notes.includes(q) || terms.includes(q) || itemsOk)) {
    return false;
  }
}
  return true;
};

const safeStorage = {
  get(key: string) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
  },
  set(key: string, val: string) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); } catch {}
  }
};

/* opcional: si tenés userId, usalo para particionar la preferencia */
const storageKey = (userId?: string) => `budgets:listParams${userId ? ':'+userId : ''}`;

/* ---------- Provider ---------- */

export const BudgetsProvider: React.FC<{
  children: React.ReactNode;
  userId?: string; // opcional
}> = ({ children, userId }) => {
  const STORAGE_KEY = storageKey(userId);

  const [list, setList] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialParams = useMemo<ListParams>(() => {
    const raw = safeStorage.get(STORAGE_KEY);
    return normalizeParams(raw ? JSON.parse(raw) : { page: 1, limit: 20 });
  }, [STORAGE_KEY]);

  const [params, setParamsState] = useState<ListParams>(initialParams);

  // secuencia para descartar respuestas viejas
  const seqRef = useRef(0);

  const persist = useCallback((p: ListParams) => {
    safeStorage.set(STORAGE_KEY, JSON.stringify(p));
  }, [STORAGE_KEY]);

  const setParams = useCallback((p: Partial<ListParams>) => {
    setParamsState(prev => {
      const next = normalizeParams({ ...prev, ...p });
      persist(next);
      return next;
    });
  }, [persist]);

  // Guardamos el último params en un ref para evitar dependencia directa
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const fetch = useCallback(async (patch: Partial<ListParams> = {}) => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);

    const merged = normalizeParams({ ...paramsRef.current, ...patch });
    setParamsState(merged);
    persist(merged);

    try {
      const data = await BudgetsAPI.list(merged);
      if (seq !== seqRef.current) return; // llegó tarde
      setList(data.rows);
      setTotal(data.total);
      setPageState(data.page);
    } catch (e: any) {
     if (seq !== seqRef.current) return;
      setError(e?.message || 'Error al cargar presupuestos');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [persist]);

  // Carga inicial automática con los parámetros persistidos
  useEffect(() => {
    // Si querés evitar doble fetch cuando la pantalla ya llama a fetch, podés dejarlo.
    fetch({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => fetch({}), [fetch]);

  /** Aplica filtros de UI: resetea página si cambia alguno de los 3 campos de filtro */
  const applyFilters = useCallback(async (p: Partial<ListParams>) => {
    const next = normalizeParams({ ...params, ...p });
    const prev = params;
    if (filtersChanged(prev, next)) next.page = 1;
    await fetch(next);
  }, [params, fetch]);

  const resetFilters = useCallback(async () => {
    await fetch({ page: 1, q: undefined, status: undefined, clientName: undefined });
  }, [fetch]);

  const setPage = useCallback(async (p: number) => {
    await fetch({ page: Math.max(1, p) });
  }, [fetch]);

  const clearError = useCallback(() => setError(null), []);

  const create = useCallback(async (payload: Partial<Budget>) => {
    const data = await BudgetsAPI.create(payload);
    setList(prev => (matchesFilters(data, params) ? [data, ...prev] : prev));
    setTotal(prev => prev + (matchesFilters(data, params) ? 1 : 0));
    return data;
  }, [params]);

  const update = useCallback(async (id: string, payload: Partial<Budget>) => {
    const data = await BudgetsAPI.update(id, payload);
    setList(prev => {
      const exists = prev.some(b => b._id === id);
      const match = matchesFilters(data, params);
      if (exists && match) return prev.map(b => (b._id === id ? data : b));
      if (exists && !match) return prev.filter(b => b._id !== id);
      if (!exists && match) return [data, ...prev];
      return prev;
    });
    return data;
  }, [params]);

  const action = useCallback(async (id: string, name: BudgetActionName, body?: unknown) => {
    const data = await BudgetsAPI.action(id, name, body);
    setList(prev => {
      const exists = prev.some(b => b._id === id);
      const match = matchesFilters(data, params);
      if (exists && match) return prev.map(b => (b._id === id ? data : b));
      if (exists && !match) return prev.filter(b => b._id !== id);
      if (!exists && match) return [data, ...prev];
      return prev;
    });
    return data;
  }, [params]);

  const value = useMemo<Ctx>(() => ({
    list, total, page,
    loading, error,
    params, setParams,
    applyFilters,
    fetch, refresh, resetFilters, setPage,
    clearError,
    create, update, action,
  }), [list, total, page, loading, error, params, setParams, applyFilters, fetch, refresh, resetFilters, setPage, clearError, create, update, action]);

  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
};