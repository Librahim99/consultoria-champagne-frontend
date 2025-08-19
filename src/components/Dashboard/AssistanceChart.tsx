import React, { useEffect, useMemo, useState, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import { FiFilter, FiTrendingUp, FiUsers, FiX, FiSearch } from 'react-icons/fi';
import styles from './AssistanceChart.module.css';
import Spinner from '../Spinner/Spinner';

type Range = 'today' | 'week' | 'month';

interface MetricsResponse {
  range: Range;
  days: Array<Record<string, number | string>>;
  clientNames: string[];
  start: string | null;
  end: string;
}

 const token = localStorage.getItem('token');


interface Props { 
  setLoading: Dispatch<SetStateAction<boolean>>; 
}

const TZ = 'America/Argentina/Buenos_Aires';
const STORAGE_KEY = 'assist-chart:clients';

const hashHue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const colorFor = (name: string) => `hsl(${hashHue(name)} 70% 55%)`;
const gradId = (name: string) => `grad-${hashHue(name)}-${name.replace(/\W+/g, '')}`;

const AssistanceChart: React.FC<Props> = ({ setLoading }) => {
  const [range, setRange] = useState<Range>('week');
  const [rawData, setRawData] = useState<Array<Record<string, number | string>>>([]);
  const [allClients, setAllClients] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // Panel y filtros
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? new Set(JSON.parse(saved)) : new Set(); }
    catch { return new Set(); }
  });
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Cache por rango + cancelación
  const cacheRef = useRef<Partial<Record<Range, MetricsResponse>>>({});
  const abortRef = useRef<AbortController | null>(null);

  const fetchMetrics = useCallback(async (r: Range) => {
    if (cacheRef.current[r]) {
      const res = cacheRef.current[r]!;
      setRawData(res.days);
      setAllClients(res.clientNames);
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await axios.get<MetricsResponse>(
        `${process.env.REACT_APP_API_URL}/api/assistances/metrics`,
        { params: { range: r }, headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal }
      );
      cacheRef.current[r] = res.data;
      setRawData(res.data.days);
      setAllClients(res.data.clientNames);
      setLoading(false);
      setErr(null);
    } catch (e: any) {
      if ((axios as any).isCancel?.(e)) return;
      const apiMsg = e?.response?.data?.message;
      const netMsg = e?.message?.includes('Network') ? 'No se pudo conectar con la API' : null;
      setErr(apiMsg || netMsg || 'Error al obtener métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  // cargar / cambiar rango
  useEffect(() => { fetchMetrics(range); }, [fetchMetrics, range]);

  // cleanup al desmontar
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // cerrar panel con click-afuera / ESC
  useEffect(() => {
    if (!panelOpen) return;
    const onDoc = (e: MouseEvent) => { if (!panelRef.current?.contains(e.target as Node)) setPanelOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [panelOpen]);

  // Totales por cliente
  const totalsByClient = useMemo(() => {
    const m: Record<string, number> = {};
    for (const name of allClients) {
      let s = 0;
      for (const row of rawData) s += Number(row[name] || 0);
      m[name] = s;
    }
    return m;
  }, [allClients, rawData]);

  // Orden por total desc
  const ranked = useMemo(
    () => [...allClients].sort((a, b) => (totalsByClient[b] || 0) - (totalsByClient[a] || 0)),
    [allClients, totalsByClient]
  );

  // Visibles: Top 8 auto si no hay selección manual
  const MAX_SERIES = 8;
  const visibleClients = useMemo(() => {
    if (selected.size === 0) return ranked.slice(0, MAX_SERIES);
    return ranked.filter(c => selected.has(c));
  }, [ranked, selected]);

  // Dataset reducido
  const data = useMemo(() => rawData.map(r => {
    const out: Record<string, number | string> = { date: String((r as any).date), total: Number((r as any).total || 0) };
    visibleClients.forEach(c => { out[c] = Number((r as any)[c] || 0); });
    return out;
  }), [rawData, visibleClients]);

  // Métricas de resumen (Total, Promedio, Pico, Tendencia)
  const yAvg = useMemo(() => {
    if (!data.length) return 0;
    let sum = 0; for (let i = 0; i < data.length; i++) sum += Number((data[i] as any).total || 0);
    return Math.round(sum / data.length);
  }, [data]);

  const summary = useMemo(() => {
    if (!data.length) return { total: 0, max: 0, maxDate: null as string | null, growthPct: 0 };
    const totals = data.map(d => Number((d as any).total || 0));
    const total = totals.reduce((a, b) => a + b, 0);
    let max = -Infinity; let maxIdx = 0;
    for (let i = 0; i < totals.length; i++) { if (totals[i] > max) { max = totals[i]; maxIdx = i; } }
    const maxDate = String((data[maxIdx] as any).date);
    const first = totals[0] || 0;
    const last = totals[totals.length - 1] || 0;
    const growthPct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
    return { total, max, maxDate, growthPct };
  }, [data]);

  const formatDateTick = useCallback((iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    if (range === 'today') return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
    if (range === 'week')  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', timeZone: TZ });
    return d.toLocaleDateString('es-AR', { day: '2-digit', timeZone: TZ });
  }, [range]);

  // persistir selección
  useEffect(() => {
    try {
      const arr: string[] = Array.from(selected.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {}
  }, [selected]);

  // handlers
  const setTop = useCallback((n: number) => setSelected(new Set(ranked.slice(0, n))), [ranked]);
  const clearSel = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback(() => setSelected(new Set(allClients)), [allClients]);
  const toggleItem = useCallback((name: string, allowSolo = false, e?: React.MouseEvent) => {
    const next = new Set(selected);
    const isChecked = selected.size === 0 ? visibleClients.indexOf(name) >= 0 : selected.has(name);
    const solo = allowSolo && (e?.altKey || e?.metaKey || e?.ctrlKey);
    if (solo) { next.clear(); next.add(name); }
    else {
      if (selected.size === 0) visibleClients.forEach(v => next.add(v));
      if (isChecked) next.delete(name); else next.add(name);
    }
    setSelected(next);
  }, [selected, visibleClients]);

  const defs = useMemo(() => (
    <defs>
      {visibleClients.map(n => (
        <linearGradient key={n} id={gradId(n)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorFor(n)} stopOpacity={0.6} />
          <stop offset="100%" stopColor={colorFor(n)} stopOpacity={0.05} />
        </linearGradient>
      ))}
    </defs>
  ), [visibleClients]);

  const captionCls = (styles as any).caption || '';

  return (
    <div className={`${styles.card}`} data-range={range}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}><FiTrendingUp /> Tendencia de asistencias</h3>
        <div className={styles.toolbar}>
          <div className={styles.rangeGroup} role="group" aria-label="Rango">
            <button type="button" className={`${styles.rangeBtn} ${range === 'today' ? styles.active : ''}`} onClick={() => setRange('today')} aria-pressed={range === 'today'}>Hoy</button>
            <button type="button" className={`${styles.rangeBtn} ${range === 'week' ? styles.active : ''}`} onClick={() => setRange('week')} aria-pressed={range === 'week'}>Semana</button>
            <button type="button" className={`${styles.rangeBtn} ${range === 'month' ? styles.active : ''}`} onClick={() => setRange('month')} aria-pressed={range === 'month'}>Mes</button>
          </div>
          <div className={styles.filterWrap} ref={panelRef}>
            <button type="button" className={styles.filterBtn} onClick={() => setPanelOpen(v => !v)} aria-expanded={panelOpen} aria-controls="assist-filter">
              <FiFilter /> Filtrar clientes
            </button>
            {panelOpen && (
              <div id="assist-filter" className={styles.filterPanel} role="dialog" aria-modal="false">
                <div className={styles.filterHeader}>
                  <strong><FiUsers /> Clientes</strong>
                  <button type="button" className={styles.rangeBtn} onClick={() => setPanelOpen(false)} aria-label="Cerrar panel"><FiX /></button>
                </div>
                <div className={styles.searchWrap}>
                  <FiSearch className={styles.searchIcon} aria-hidden="true" />
                  <input className={styles.search} type="search" placeholder="Buscar cliente…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar cliente" />
                </div>
                <div className={styles.filterShortcuts}>
                  <button onClick={() => setTop(5)} type="button">Top 5</button>
                  <button onClick={() => setTop(8)} type="button">Top 8</button>
                  <button onClick={selectAll} type="button">Todos</button>
                  <button onClick={clearSel} type="button">Limpiar</button>
                </div>
                <ul role="listbox" aria-label="Seleccionar clientes">
                  {ranked
                    .filter(n => n.toLowerCase().includes(search.toLowerCase()))
                    .map((name) => {
                      const checked = selected.size === 0 ? visibleClients.indexOf(name) >= 0 : selected.has(name);
                      return (
                        <li key={name}>
                          <label>
                            <input type="checkbox" checked={checked} onChange={(e) => toggleItem(name, false, e as any)} />
                            <span>{name}</span>
                          </label>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs / Caption accesible */}
      <div className={captionCls} aria-live="polite">
        Total: <strong>{summary.total}</strong> · Promedio: <strong>{yAvg}</strong> · Pico: <strong>{summary.max}</strong>{summary.maxDate ? ` (${formatDateTick(summary.maxDate)})` : ''} · Δ: <strong>{summary.growthPct >= 0 ? '▲' : '▼'} {Math.abs(summary.growthPct)}%</strong> · Series: <strong>{visibleClients.length}</strong>
      </div>

      {err && <div className={styles.error}>{err}</div>}
      { !err && (
        data.length === 0 ? (
          <p className={styles.empty}><span className={styles.emptyInner}><FiTrendingUp /> Sin datos</span></p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={data}>
              {defs}
              <CartesianGrid strokeDasharray="3 6" />
              <XAxis dataKey="date" tickFormatter={formatDateTick} />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={yAvg} stroke="var(--primary)" strokeDasharray="4 4" label="Promedio" />
              <Area type="monotone" dataKey="total" stroke="var(--primary)" fill="var(--primary)" />
              {visibleClients.map((name) => (
                <Area key={name} type="monotone" dataKey={name} stroke={colorFor(name)} fill={`url(#${gradId(name)})`} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  );
};

export default AssistanceChart;
