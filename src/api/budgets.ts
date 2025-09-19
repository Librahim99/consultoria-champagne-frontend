import axios from 'axios';
import type { Budget } from '../utils/interfaces';

export type ListParams = Partial<{ q: string; status: string; clientName: string; page: number; limit: number }>;

const base = `${process.env.REACT_APP_API_URL}/api/budgets`;

export const BudgetsAPI = {
  async list(params: ListParams) {
    const token = localStorage.getItem('token'); // patrón Dashboard/Clients
    const { data } = await axios.get(base, { params, headers: { Authorization: `Bearer ${token}` } });
    return data as { rows: Budget[]; total: number; page: number };
  },
  async create(payload: Partial<Budget>) {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(base, payload, { headers: { Authorization: `Bearer ${token}` } });
    return data as Budget;
  },
  async update(id: string, payload: Partial<Budget>) {
    const token = localStorage.getItem('token');
    const { data } = await axios.put(`${base}/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
    return data as Budget;
  },
  async action(id: string, name: 'submit'|'approve'|'reject'|'send'|'accept'|'lose', body?: any) {
    const token = localStorage.getItem('token');
    const { data } = await axios.post(`${base}/${id}/${name}`, body || {}, { headers: { Authorization: `Bearer ${token}` } });
    return data as Budget;
  },
};
