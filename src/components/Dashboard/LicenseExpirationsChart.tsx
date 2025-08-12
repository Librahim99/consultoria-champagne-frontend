import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import styles from './LicenseExpirationsChart.module.css';
import Spinner from '../Spinner/Spinner';


type WindowRange = 30 | 60 | 90;

interface ClientRow 
{ _id: string; 
  name: string; 
  lastUpdate?: string | null; 
  active?: boolean; 
}

  // --- Tipos top-level (type alias no se hoistea) ---
type DataRow = {
  id: string;
  name: string;
  lastUpdate: Date | null;
  dueDate: Date | null;
  daysLeft: number;
};

interface Props {
  className?: string;
  /** días que dura la licencia desde lastUpdate (por defecto: 365) */
  cycleDays?: number;
  /** ventana de visualización por defecto (30/60/90) */
  defaultRange?: WindowRange;
  /** incluir sólo clientes activos (default true) */
  onlyActive?: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>; 
  /** máximo de barras a mostrar (default 15) */
  maxItems?: number;
  /** umbral de urgencia (default 15 días) */
  urgentDays?: number;
}

// Tipo mínimo para el contenido del Tooltip (evita incompatibilidades de d.ts)
type TooltipRenderProps = {
  payload?: Array<{ payload?: DataRow & { name: string } }>;
  label?: string | number;
  active?: boolean;
};

const TZ = 'America/Argentina/Buenos_Aires';
const MS_DAY = 86400000;

const addDays = (iso: string | Date, days: number) =>
  new Date(new Date(iso).getTime() + days * MS_DAY);

const daysBetween = (a: Date, b: Date) =>
  Math.ceil((a.getTime() - b.getTime()) / MS_DAY);

/** color por urgencia */
const colorByDaysLeft = (dLeft: number) => {
  if (dLeft < 0) return 'hsl(0 85% 55%)';            // vencido
  if (dLeft <= 15) return 'hsl(12 90% 55%)';         // urgente
  if (dLeft <= 30) return 'hsl(35 90% 55%)';         // alto
  if (dLeft <= 45) return 'hsl(45 85% 60%)';         // medio
  if (dLeft <= 90) return 'hsl(170 70% 45%)';        // ok cercano
  return 'hsl(140 60% 45%)';                         // ok
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: TZ });

const LicenseExpirationsChart: React.FC<Props> = ({
  className, cycleDays = 365, defaultRange = 60, onlyActive = true,
  maxItems = 15, urgentDays = 15,setLoading
}) => {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<WindowRange>(defaultRange);
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);
  const panelRef = useRef<HTMLDivElement|null>(null);

  const fetchClients = useCallback(async () => {
     setErr(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<ClientRow[]>(
        `${process.env.REACT_APP_API_URL}/api/clients`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(res.data || []);
      setLoading(false);
    } catch (e: any) {
      const apiMsg = e?.response?.data?.message;
      setErr(apiMsg || 'Error al obtener clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // cerrar panel al click afuera/ESC
  useEffect(() => {
    if (!panelOpen) return;
    const onDoc = (e: MouseEvent) => { if (!panelRef.current?.contains(e.target as Node)) setPanelOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [panelOpen]);

  type DataRow = {
    id: string; name: string;
    lastUpdate: Date | null; dueDate: Date | null; daysLeft: number;
  };

  const baseData: DataRow[] = useMemo(() => {
    const now = new Date();
    return (rows || [])
      .filter(r => r.name && (!onlyActive || r.active !== false))
      .map<DataRow>(r => {
        const lu = r.lastUpdate ? new Date(r.lastUpdate) : null;
        const due = lu ? addDays(lu, cycleDays) : null;
        const left = due ? daysBetween(due, now) : -9999; // sin fecha => muy vencido
        return { id: r._id, name: r.name, lastUpdate: lu, dueDate: due, daysLeft: left };
      });
  }, [rows, onlyActive, cycleDays]);

  const data: DataRow[] = useMemo(() => {
    // filtros existentes (urgentes/todos, búsqueda, ventana temporal)
    const filtered = baseData
      .filter(d => (showOnlyUrgent ? d.daysLeft <= 30 : true))
      .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
      .filter(d => (range ? d.daysLeft <= range || d.daysLeft < 0 : true));

    // prioridad: vencidos/≤ urgentDays primero; luego por menor daysLeft
    const sorted = filtered.sort((a, b) => {
      const aUrg = a.daysLeft <= urgentDays ? 0 : 1;
      const bUrg = b.daysLeft <= urgentDays ? 0 : 1;
      if (aUrg !== bUrg) return aUrg - bUrg;
      if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
      return a.name.localeCompare(b.name);
    });

    return sorted.slice(0, Math.max(1, maxItems)); // Top N
  }, [baseData, showOnlyUrgent, search, range, maxItems, urgentDays]);

  // Stats dinámicos para caption/KPIs
  const stats = useMemo(() => {
    const total = data.length;
    if (!total) return { top: 0, expired: 0, urgent: 0, avg: 0, nextDue: null as Date | null };
    let expired = 0, urgent = 0, sum = 0;
    let next: DataRow | null = null;
    for (const d of data) {
      if (d.daysLeft < 0) expired++;
      if (d.daysLeft >= 0 && d.daysLeft <= urgentDays) urgent++;
      sum += d.daysLeft;
      if (d.dueDate && d.daysLeft >= 0 && (!next || d.daysLeft < next.daysLeft)) next = d;
    }
    const avg = Math.round(sum / total);
    return { top: total, expired, urgent, avg, nextDue: next?.dueDate || null };
  }, [data, urgentDays]);

  
  const isReduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  
  // Tooltip tipado y estable (declarar ANTES de los returns condicionales)
  const renderTooltip = useCallback((p: TooltipRenderProps) => {
    const payload = (p?.payload?.[0]?.payload || null) as (DataRow & { name: string }) | null;
    if (!payload) return null;
    
    const left = payload.daysLeft;
    const due  = payload.dueDate ? fmtDate(payload.dueDate) : '—';
    const lu   = payload.lastUpdate ? fmtDate(payload.lastUpdate) : '—';
    
    return (
      <div style={{ borderRadius: 12, padding: '6px 8px' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{payload.name}</div>
      <div>{left < 0 ? 'Vencido' : `${left} días`}</div>
      <div>Vence: {due} · Últ. act: {lu}</div>
    </div>
  );
}, []);

if (err) return <div className={styles.error}>{err}</div>;

  return (
    <div className={`${styles.card} ${className || ''}`} data-range={range} aria-label="Vencimientos de licencias">
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          <ClockIcon /> Próximos 15 clientes a vencer
        </h3>

        <div className={styles.toolbar}>
          <div className={styles.rangeGroup} role="group" aria-label="Ventana">
            <button type="button"
              className={`${styles.rangeBtn} ${range === 30 ? styles.active : ''}`}
              onClick={() => setRange(30)} aria-pressed={range === 30}>30d</button>
            <button type="button"
              className={`${styles.rangeBtn} ${range === 60 ? styles.active : ''}`}
              onClick={() => setRange(60)} aria-pressed={range === 60}>60d</button>
            <button type="button"
              className={`${styles.rangeBtn} ${range === 90 ? styles.active : ''}`}
              onClick={() => setRange(90)} aria-pressed={range === 90}>90d</button>
          </div>

          <div className={styles.filterWrap} ref={panelRef}>
            <button type="button" className={styles.filterBtn}
              aria-haspopup="dialog" aria-expanded={panelOpen}
              onClick={() => setPanelOpen(v => !v)}>
              <FilterIcon /> Filtros
            </button>

            {panelOpen && (
              <div className={styles.filterPanel} role="dialog" aria-label="Filtros">
                <div className={styles.filterHeader}>
                  <strong><FilterIcon /> Opciones</strong>
                  <div className={styles.filterShortcuts}>
                    <button onClick={() => setShowOnlyUrgent(true)}>Sólo urgentes</button>
                    <button onClick={() => setShowOnlyUrgent(false)}>Todos</button>
                    <button className={styles.clearBtn} onClick={() => setSearch('')}>Limpiar</button>
                  </div>
                </div>

                <div className={styles.searchWrap}>
                  <SearchIcon className={styles.searchIcon} aria-hidden />
                  <input
                    className={styles.search}
                    placeholder="Buscar cliente…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar cliente"
                  />
                  {search && (
                    <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Borrar búsqueda">
                      <CloseIcon />
                    </button>
                  )}
                </div>

                <div className={styles.legend}>
                  <span className={styles.badge} style={{ background: 'hsl(0 85% 55%)' }}>Vencido</span>
                  <span className={styles.badge} style={{ background: 'hsl(12 90% 55%)' }}>0–15d</span>
                  <span className={styles.badge} style={{ background: 'hsl(35 90% 55%)' }}>16–30d</span>
                  <span className={styles.badge} style={{ background: 'hsl(45 85% 60%)' }}>31–45d</span>
                  <span className={styles.badge} style={{ background: 'hsl(170 70% 45%)' }}>46–90d</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* caption con KPIs */}
      <div className={styles.caption} aria-live="polite">
        Top {Math.min(data.length, maxItems)} · Vencidos: <strong>{stats.expired}</strong> · Urgentes (≤{urgentDays}d): <strong>{stats.urgent}</strong> · Promedio: <strong>{stats.avg}d</strong> · Próximo: <strong>{stats.nextDue ? fmtDate(stats.nextDue) : '—'}</strong>
      </div>

      <div className={`${styles.chartWrap} ${isReduced ? '' : (styles as any).fadeIn || ''}`}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 10, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeOpacity={0.14} horizontal vertical={false} />
            <XAxis
              type="number"
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(v) => `${v}d`}
              stroke="currentColor"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={Math.min(220, Math.max(120, Math.floor(window.innerWidth * 0.15)))}
              stroke="currentColor"
            />
            <Tooltip content={renderTooltip} wrapperStyle={{ outline: 'none' }} cursor={{ fillOpacity: 0.06 }} />
            {/* Línea de urgencia fija en 15d (visual) */}
            <ReferenceLine x={15} stroke="var(--error)" strokeDasharray="4 6" ifOverflow="extendDomain" />

            <Bar dataKey="daysLeft" radius={[8, 8, 8, 8]} isAnimationActive={!isReduced}>
              {data.map((d) => (
                <Cell key={d.id} fill={colorByDaysLeft(d.daysLeft)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* iconitos inline (evitamos deps nuevas) */
const ClockIcon  = (p:any) => <svg width="16" height="16" viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M12 1a11 11 0 1 0 11 11A11.013 11.013 0 0 0 12 1Zm1 12h6v-2h-5V6h-2v7Z"/></svg>;
const FilterIcon = (p:any) => <svg width="16" height="16" viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M3 5h18v2l-7 7v5l-4 2v-7L3 7z"/></svg>;
const SearchIcon = (p:any) => <svg width="16" height="16" viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M10 18a8 8 0 1 1 5.3-14l4.9 4.9-1.4 1.4-4.2-4.2A6 6 0 1 0 10 16z"/></svg>;
const CloseIcon  = (p:any) => <svg width="16" height="16" viewBox="0 0 24 24" {...p}><path fill="currentColor" d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>;

export default React.memo(LicenseExpirationsChart);
