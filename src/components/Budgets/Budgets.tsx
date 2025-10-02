// src/pages/Budgets/Budgets.tsx
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BudgetsContext } from '../../contexts/BudgetsContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { UserContext } from '../../contexts/UserContext';
import CustomTable from '../../components/CustomTable/CustomTable';
import BudgetsDetailModal from '../../components/Budgets/BudgetsDetailModal';
import BudgetForm from '../../components/BudgetsForm/BudgetsForm';
import BudgetStatusBadge from '../../components/BudgetStatusBadge/BudgetStatusBadge';
import type { Budget, BudgetItem, BudgetStatus } from '../../utils/interfaces';
import { BUDGET_STATUS_LABELS } from '../../utils/interfaces';
import { ranks, type UserRank } from '../../utils/enums';
import styles from './Budgets.module.css';

type ClientPick = { _id: string; name: string; common?: string };

const Budgets: React.FC = () => {
  const ctx = useContext(BudgetsContext);
  const { theme } = useContext(ThemeContext);
  const { userRank, userId } = useContext(UserContext);

  const providerMissing = !ctx;

  // -------- UI state (local) --------
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [filters, setFilters] = useState<{ status: '' | BudgetStatus; client: string; q: string }>({
    status: '' as '' | BudgetStatus,
    client: '',
    q: '',
  });

  // Typeahead del filtro Cliente
  const [clientSug, setClientSug] = useState<ClientPick[]>([]);
  const [clientOpen, setClientOpen] = useState(false);
  useEffect(() => {
    const q = (filters.client || '').trim();
    if (q.length < 2) { setClientSug([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const url = `${process.env.REACT_APP_API_URL}/api/clients/buscar/${encodeURIComponent(q)}?limit=8`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal
        });
        const data = res.ok ? await res.json() : [];
        setClientSug(Array.isArray(data) ? data : []);
        setClientOpen(true);
      } catch { /* abort/network */ }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [filters.client]);

  // Carga inicial solo 1 vez (evita loop por cambios en ctx)
  useEffect(() => {
    if (ctx) ctx.resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atajos rápidos
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); searchRef.current?.focus();
      }
      if (String(e.key || '').toLowerCase() === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); setEditing(null); setShowForm(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // -------- Helpers de formato --------
  const fmt0 = useMemo(() => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }), []);
  const fmtDate = useMemo(
    () => (v?: string | Date) => (v ? new Date(v).toLocaleDateString('es-AR') : ''),
    []
  );

  const calcHours = useCallback((row?: Budget) => {
    if (!row || !Array.isArray(row.items)) return 0;
    const items = row.items as BudgetItem[];
    return items.reduce((acc, it) => acc + Number(it?.qty || 0), 0);
  }, []);

  const calcTotalARS = useCallback((row?: Budget) => {
    if (!row || !Array.isArray(row.items)) return 0;
    const items = row.items as BudgetItem[];
    const subtotal = items.reduce((acc, it) => acc + Number(it?.qty || 0) * Number(it?.unitPrice || 0), 0);
    const tax = items.reduce((acc, it) => {
      const rate = Number(it?.taxRate || 0);
      return acc + Number(it?.qty || 0) * Number(it?.unitPrice || 0) * (rate > 1 ? rate / 100 : rate);
    }, 0);
    const discountFixed = Number((row as any)?.discountFixed ?? 0);
    return Math.max(0, subtotal + tax - discountFixed);
  }, []);

  // -------- Columnas --------
  const STATUS_OPTIONS = useMemo(
    () =>
      (['DRAFT','IN_REVIEW','APPROVED','REJECTED','SENT','ACCEPTED','LOST','EXPIRED'] as BudgetStatus[])
        .map(s => ({ value: s, label: BUDGET_STATUS_LABELS[s] })),
    []
  );

  const columns = useMemo(
    () => [
      { field: 'code', headerName: 'Código', sortable: true, filterable: true, width: '110px' },
      {
        field: 'summary',
        headerName: 'Detalle',
        sortable: false,
        filterable: false,
        width: '420px',
        cellRenderer: (row?: Budget) => {
          if (!row || !Array.isArray(row.items)) return '—';
          const items = row.items as any[];
          const first = items[0]?.description || row.notes || '—';
          const rest = Math.max((items?.length || 0) - 1, 0);
          return (
            <span className={styles.desc} title={items.map((i: any) => i?.description ?? '').join(' • ')}>
              {first} {rest > 0 && <em className={styles.more}>+{rest} más</em>}
            </span>
          );
        },
      },
      { field: 'clientName', headerName: 'Cliente', sortable: true, filterable: true, width: '220px' },
      {
        field: 'totalCalc',
        headerName: 'Total (ARS)',
        sortable: true,
        filterable: true,
        width: '150px',
        valueGetter: (row?: Budget) => calcTotalARS(row),
        valueFormatter: (_: any, row?: Budget) => fmt0.format(calcTotalARS(row)),
      },
      {
        field: 'hours',
        headerName: 'Horas',
        sortable: false,
        filterable: false,
        width: '90px',
        cellRenderer: (row?: Budget) => fmt0.format(calcHours(row)),
      },
      {
        field: 'validUntil',
        headerName: 'Válido hasta',
        sortable: true,
        filterable: true,
        width: '160px',
        cellRenderer: (row?: Budget) => {
          if (!row) return '—';
          const d = row.validUntil ? new Date(row.validUntil) : null;
          if (!d) return '—';
          const today = new Date();
          const days = Math.ceil((d.getTime() - new Date(today.toDateString()).getTime()) / (1000 * 60 * 60 * 24));
          const cls =
            days < 0 ? styles.badgeDanger :
            days <= 7 ? styles.badgeWarn :
            styles.badgeOk;
          return (
            <span className={styles.validCell}>
              {fmtDate(d)}
              <span className={`${styles.badge} ${cls}`} title={`Restan ${days} día(s)`}>
                {days >= 0 ? `D-${days}` : `Vencido`}
              </span>
            </span>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Estado',
        sortable: true,
        filterable: true,
        width: '160px',
        cellRenderer: (row?: Budget) => <BudgetStatusBadge status={(row?.status as BudgetStatus) ?? 'DRAFT'} />,
      },
      {
        field: 'createdAt',
        headerName: 'Creado',
        sortable: true,
        filterable: true,
        width: '130px',
        valueFormatter: (v: string) => fmtDate(v),
      },
    ],
    [fmt0, fmtDate, calcHours, calcTotalARS]
  );

  // -------- Acciones / UI handlers --------
  const onRefresh = useCallback(() => {
    if (!ctx) return;
    ctx.fetch({
      q: filters.q || undefined,
      status: filters.status || undefined,
      clientName: filters.client || undefined,
      page: 1,
    });
  }, [ctx]); // solo depende del contexto

  const onReset = useCallback(() => {
    setFilters({ q: '', client: '', status: '' as '' });
    ctx?.resetFilters();
  }, [ctx]);

  const onRowClick = useCallback((row: Budget) => {
    setEditing(row);
    setShowForm(true);
  }, []);

  const onRowContextMenu = useCallback(
    (row: Budget) => {
      const APPROVERS: Readonly<UserRank[]> = [ranks.TOTALACCESS, ranks.CONSULTORCHIEF, ranks.ADMIN];
      const canApprove = APPROVERS.includes(userRank);
      return [
        { label: '✏️ Editar', onClick: () => { setEditing(row); setShowForm(true); } },
        { label: '📤 Enviar a revisión', onClick: () => ctx?.action(row._id, 'submit'),  disabled: !['DRAFT','REJECTED'].includes(row.status) },
        { label: '✅ Aprobar',            onClick: () => ctx?.action(row._id, 'approve'), disabled: !canApprove || row.status!=='IN_REVIEW' },
        { label: '⛔ Rechazar',           onClick: () => ctx?.action(row._id, 'reject'),  disabled: !canApprove || row.status!=='IN_REVIEW' },
        { label: '📧 Marcar Enviado',     onClick: () => ctx?.action(row._id, 'send'),    disabled: row.status!=='APPROVED' },
        { label: '🤝 Aceptar',            onClick: () => ctx?.action(row._id, 'accept'),  disabled: !canApprove || !['SENT','APPROVED'].includes(row.status) },
        { label: '🗑 Marcar Perdido',     onClick: () => ctx?.action(row._id, 'lose'),    disabled: !canApprove },
      ];
    },
    [ctx, userRank]
  );

  if (providerMissing) {
    return (
      <div className={styles.container} data-theme={theme}>
        ⚠️ Falta envolver esta ruta con <code>BudgetsProvider</code>.
      </div>
    );
  }

  const rows = ctx.list ?? [];
  const loading = ctx.loading;

  return (
    <div className={styles.container} data-theme={theme}>
      <header className={styles.header}>
        <h1 className={styles.title}>💼 Presupuestos</h1>

        <div className={styles.filters} role="search">
          <div className={styles.searchWrap}>
            <input
              ref={searchRef}
              placeholder="Buscar..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
              aria-label="Buscar en presupuestos"
            />
            {filters.q && (
              <button
                type="button"
                className={styles.clearBtn}
                aria-label="Limpiar búsqueda"
                onClick={() => setFilters((f) => ({ ...f, q: '' }))}
              >
                ×
              </button>
            )}
          </div>

          {/* Cliente con typeahead */}
          <div className={styles.typeaheadWrap}>
            <input
              placeholder="Cliente"
              value={filters.client}
              onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
              onFocus={() => setClientOpen(true)}
              onBlur={() => setTimeout(() => setClientOpen(false), 150)}
              aria-label="Filtrar por cliente"
              aria-expanded={clientOpen}
              aria-controls="client-sug-list"
            />
            {clientOpen && clientSug.length > 0 && (
              <ul id="client-sug-list" className={styles.typeaheadList} role="listbox">
                {clientSug.map(c => (
                  <li
                    key={c._id}
                    className={styles.typeaheadItem}
                    role="option"
                    onMouseDown={() => {
                      setFilters((f) => ({ ...f, client: c.name }));
                      setClientOpen(false);
                    }}
                    title={c.common ? `Común ${c.common}` : c.name}
                  >
                    <span className={styles.typeaheadMain}>{c.name}</span>
                    {c.common && <span className={styles.typeaheadSec}>· {c.common}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value || '') as '' | BudgetStatus }))}
            aria-label="Estado"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button onClick={onRefresh} title="Aplicar filtros">Aplicar</button>
          <button onClick={onReset} className={styles.ghost} title="Limpiar filtros">Limpiar</button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} title="Nuevo (Ctrl/Cmd+N)">Nuevo</button>
        </div>
      </header>

      <div onContextMenu={(e) => e.preventDefault()} style={{ width: '100%', position: 'relative' }}>
        {loading && <div className={styles.loadingBar} aria-live="polite">Cargando…</div>}
        <CustomTable
          rowData={rows}
          columnDefs={columns as any}
          pagination
          defaultPageSize={15}
          searchable
          customizable
          storageKey="budgetsTable"
          onRefresh={onRefresh}
          onRowContextMenu={onRowContextMenu as any}
          onRowClick={onRowClick}
          loggedInUserId={userId}
          userRank={userRank}
        />
        {!loading && rows.length === 0 && (
          <div className={styles.emptyHint}>No hay presupuestos para los filtros actuales.</div>
        )}
      </div>

      <BudgetsDetailModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        size="xl"
        title={editing ? `Editar Presupuesto #${editing.code}` : 'Nuevo Presupuesto'}
        subtitle={editing?.clientName}
        initialFocusSelector="input[name='clientName']"
      >
        <BudgetForm value={editing} onSaved={() => { setShowForm(false); onRefresh(); }} />
      </BudgetsDetailModal>
    </div>
  );
};

export default Budgets;
