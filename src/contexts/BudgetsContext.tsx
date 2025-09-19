import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import type { Budget } from '../utils/interfaces';
import { BudgetsAPI, type ListParams } from '../api/budgets';

type Ctx = {
  list: Budget[];
  total: number;
  page: number;
  loading: boolean;
  fetch: (params?: ListParams) => Promise<void>;
  create: (payload: Partial<Budget>) => Promise<Budget>;
  update: (id: string, payload: Partial<Budget>) => Promise<Budget>;
  action: (id: string, name: 'submit'|'approve'|'reject'|'send'|'accept'|'lose', body?: any) => Promise<Budget>;
};

export const BudgetsContext = createContext<Ctx | null>(null);

export const BudgetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [list, setList] = useState<Budget[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const lastParams = useRef<ListParams>({ page: 1, limit: 20 });

  const fetch = useCallback(async (params: ListParams = {}) => {
    setLoading(true);
    lastParams.current = { ...lastParams.current, ...params };
    try {
      const data = await BudgetsAPI.list(lastParams.current);
      setList(data.rows);
      setTotal(data.total);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Partial<Budget>) => {
    const data = await BudgetsAPI.create(payload);
    setList(prev => [data, ...prev]);
    setTotal(prev => prev + 1);
    return data;
  }, []);

  const update = useCallback(async (id: string, payload: Partial<Budget>) => {
    const data = await BudgetsAPI.update(id, payload);
    setList(prev => prev.map(b => (b._id === id ? data : b)));
    return data;
  }, []);

  type BudgetActionName = 'submit' | 'approve' | 'reject' | 'send' | 'accept' | 'lose';
  const action = useCallback(async (id: string, name: BudgetActionName, body?: unknown) => {
    const data = await BudgetsAPI.action(id, name, body);
    setList(prev => prev.map(b => (b._id === id ? data : b)));
    return data;
  }, []);

  const value = useMemo(() => ({ list, total, page, loading, fetch, create, update, action }), [list, total, page, loading, fetch, create, update, action]);
  return <BudgetsContext.Provider value={value}>{children}</BudgetsContext.Provider>;
};
