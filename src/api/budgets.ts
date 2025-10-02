import type { Budget } from "../utils/interfaces";
import { http } from "./http";

export type ListParams = Partial<{
  q: string;
  status: string;
  clientName: string;
  page: number;
  limit: number;
}>;

const base = `/api/budgets`; // con baseURL en http, no dupliques el host acá

export const BudgetsAPI = {
  async list(params: ListParams) {
    const { data } = await http.get(base, { params });
    return data as { rows: Budget[]; total: number; page: number };
  },
  async create(payload: Partial<Budget>) {
    const { data } = await http.post(base, payload);
    return data as Budget;
  },
  async update(id: string, payload: Partial<Budget>) {
    const { data } = await http.put(`${base}/${id}`, payload);
    return data as Budget;
  },
  async action(
    id: string,
    name: "submit" | "approve" | "reject" | "send" | "accept" | "lose",
    body?: any
  ) {
    const { data } = await http.post(`${base}/${id}/${name}`, body || {});
    return data as Budget;
  },
};