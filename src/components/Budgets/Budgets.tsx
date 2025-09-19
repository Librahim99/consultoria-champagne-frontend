import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BudgetsContext } from '../../contexts/BudgetsContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { UserContext } from '../../contexts/UserContext';
import CustomTable from '../../components/CustomTable/CustomTable';
import BudgetsDetailModal from '../../components/Budgets/BudgetsDetailModal';
import BudgetForm from '../../components/BudgetsForm/BudgetsForm';
import BudgetStatusBadge from '../../components/BudgetStatusBadge/BudgetStatusBadge';
import type { Budget, BudgetStatus } from '../../utils/interfaces';
import { BUDGET_STATUS_LABELS } from '../../utils/interfaces';
import { ranks, type UserRank } from '../../utils/enums';
import styles from './Budgets.module.css';

const Budgets: React.FC = () => {
  const ctx = useContext(BudgetsContext);
  const { theme } = useContext(ThemeContext);
  const { userRank, userId } = useContext(UserContext);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [filters, setFilters] = useState<{ status: '' | BudgetStatus; client: string; q: string }>({
    status: '' as '' | BudgetStatus,
    client: '',
    q: '',
  });

  const providerMissing = !ctx;

  useEffect(() => {
    if (!ctx) return;
    ctx.fetch({ page: 1, limit: 50 });
  }, [ctx]);

  const rows = ctx?.list ?? [];

  // ----- FORMATOS ES-AR -----
  const fmtARS = useMemo(
    () => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    []
  );
  const fmtDate = useMemo(
    () => (v?: string) => (v ? new Date(v).toLocaleDateString('es-AR') : ''),
    []
  );

  const STATUS_OPTIONS = useMemo(
    () =>
      (['DRAFT','IN_REVIEW','APPROVED','REJECTED','SENT','ACCEPTED','LOST','EXPIRED'] as BudgetStatus[])
        .map(s => ({ value: s, label: BUDGET_STATUS_LABELS[s] })),
    []
  );

  const columns = useMemo(
    () => [
      { field: 'code', headerName: 'Código', sortable: true, filterable: true, width: '110px' },

      // Detalle: primer ítem + badge +N
      {
        field: 'summary',
        headerName: 'Detalle',
        sortable: false,
        filterable: false,
        width: '420px',
        cellRenderer: (row: Budget) => {
          const items = (row.items ?? []) as any[];
          const first = items[0]?.description || row.notes || '—';
          const rest = Math.max((items?.length || 0) - 1, 0);
          return (
            <span className={styles.desc} title={items.map((i: any) => i.description).join(' • ')}>
              {first} {rest > 0 && <em className={styles.more}>+{rest} más</em>}
            </span>
          );
        },
      },

      { field: 'clientName', headerName: 'Cliente', sortable: true, filterable: true, width: '220px' },

      // Total en ARS (sin decimales, puntos de miles)
      {
        field: 'total',
        headerName: 'Total (ARS)',
        sortable: true,
        filterable: true,
        width: '140px',
        valueFormatter: (v: any) => (typeof v === 'number' ? fmtARS.format(v) : v),
      },

      // Horas totales (suma de qty) — si no lo querés, borrá este bloque
      {
        field: 'hours',
        headerName: 'Horas',
        sortable: false,
        filterable: false,
        width: '90px',
        cellRenderer: (row: Budget) => {
          const items = (row.items ?? []) as any[];
          const totalHrs = items.reduce((acc, it) => acc + Number(it?.qty || 0), 0);
          return fmtARS.format(totalHrs);
        },
      },

      {
        field: 'status',
        headerName: 'Estado',
        sortable: true,
        filterable: true,
        width: '160px',
        cellRenderer: (row: Budget) => <BudgetStatusBadge status={row.status} />,
      },
      {
        field: 'createdAt',
        headerName: 'Creado',
        sortable: true,
        filterable: true,
        width: '140px',
        valueFormatter: (v: string) => fmtDate(v),
      },
    ],
    [fmtARS, fmtDate]
  );

  const onRefresh = useCallback(() => {
    if (!ctx) return;
    ctx.fetch({
      q: filters.q || undefined,
      status: filters.status || undefined,
      clientName: filters.client || undefined,
      page: 1,
    });
  }, [ctx, filters]);

  const onRowClick = useCallback((row: Budget) => {
    setEditing(row);
    setShowForm(true);
  }, []);

  const onRowContextMenu = useCallback(
    (row: Budget) => {
      const APPROVERS: Readonly<UserRank[]> = [ranks.TOTALACCESS, ranks.CONSULTORCHIEF, ranks.ADMIN];
      const canApprove = APPROVERS.includes(userRank);

      return [
        { label: ' Editar', onClick: () => { setEditing(row); setShowForm(true); } },
        { label: ' Enviar a revisión', onClick: () => ctx?.action(row._id, 'submit'), disabled: !['DRAFT','REJECTED'].includes(row.status) },
        { label: ' Aprobar', onClick: () => ctx?.action(row._id, 'approve'), disabled: !canApprove || row.status!=='IN_REVIEW' },
        { label: ' Rechazar', onClick: () => ctx?.action(row._id, 'reject'), disabled: !canApprove || row.status!=='IN_REVIEW' },
        { label: ' Marcar Enviado', onClick: () => ctx?.action(row._id, 'send'), disabled: row.status!=='APPROVED' },
        { label: ' Aceptar', onClick: () => ctx?.action(row._id, 'accept'), disabled: !canApprove || !['SENT','APPROVED'].includes(row.status) },
        { label: ' Marcar Perdido', onClick: () => ctx?.action(row._id, 'lose'), disabled: !canApprove },
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

  return (
    <div className={styles.container} data-theme={theme}>
      <header className={styles.header}>
        <h1 className={styles.title}>💼 Presupuestos</h1>
        <div className={styles.filters}>
          <input
            placeholder="Buscar..."
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
          />
          <input
            placeholder="Cliente"
            value={filters.client}
            onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && onRefresh()}
          />
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
          <button onClick={onRefresh}>Aplicar</button>
          <button onClick={() => { setEditing(null); setShowForm(true); }}>Nuevo</button>
        </div>
      </header>

      <div onContextMenu={(e) => e.preventDefault()} style={{ width: '100%' }}>
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
        {rows.length === 0 && (
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
