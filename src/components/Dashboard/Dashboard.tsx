import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Spinner/Spinner';
import Modal from '../Modal/Modal';
import CrearMeetForm from '../../components/GoogleAPIs/CrearMeetForm';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { ranks } from '../../utils/enums';
import {
  FaUser,
  FaBug,
  FaClipboardCheck,
  FaUsers,
  FaVideo,
  FaChartPie
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './Dashboard.module.css';

interface Stats {
  users: number;
  clients: number;
  incidents: number;
  pendings: number;
  assistances: number;
}

interface Shortcut {
  to: string;
  title: string;
  description: string;
  icon: JSX.Element;
  bg: string;
  show?: boolean;
}

interface AsistenciaStats {
  cantidadHoy: number;
  totalHorasHoy: number;
  topCliente: string;
  licenciasPorVencer: number;
}

/** Resultado (dry-run) que devuelve /api/licenses/run-reminders */
interface LicenseReminderCandidate {
  client?: string;
  sentTo?: string;
  skipped?: 'duplicate';
  dryRun?: boolean;
}

/** Fila devuelta por /api/licenses/inspect */
interface InspectRow {
  name: string;
  common?: string;
  active?: boolean;
  lastUpdate: string | null;   // YYYY-MM-DD
  vence: string | null;        // YYYY-MM-DD
  diasRestantes: number | null;
  reason?: string;             // 'vencida', '> maxDays', 'sin lastUpdate', ''
}

const Dashboard: React.FC = () => {
  const { userRank, userId } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);

  const [stats, setStats] = useState<Stats>({
    users: 0,
    clients: 0,
    incidents: 0,
    pendings: 0,
    assistances: 0
  });

  const [asistenciaStats, setAsistenciaStats] = useState<AsistenciaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // === Licencias (≤15 días) ===
  const MAX_DAYS = 16;                // “≤ 15 días”
  const VISIBLE_ROWS = 30;            // cuántas filas mostrar en mini grilla
  const [licenseCandidates, setLicenseCandidates] = useState<LicenseReminderCandidate[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState<boolean>(false);

  // Mini-grilla
  const [expiringRows, setExpiringRows] = useState<InspectRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const licenseCount = expiringRows.length;

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No se encontró token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const config = getAuthHeaders();
      const endpoints = ['users', 'clients', 'incidents', 'pending', 'assistances'];
      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          axios.get(`${process.env.REACT_APP_API_URL}/api/${endpoint}`, config)
        )
      );
      setStats({
        users: responses[0].data.length,
        clients: responses[1].data.length,
        incidents: responses[2].data.length,
        pendings: responses[3].data.length,
        assistances: responses[4].data.length
      });
    } catch (error: any) {
      console.error('❌ Error al obtener estadísticas:', error?.response?.data || error);
      toast.error('Error al obtener estadísticas');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // Candidatos (dry-run) para badge y botón Enviar
  const loadLicenseCandidates = useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const config = getAuthHeaders();
      const url = `${process.env.REACT_APP_API_URL}/api/licenses/run-reminders?dryRun=true&maxDays=${MAX_DAYS}`;
      const res = await axios.get<{ ok: boolean; sent: LicenseReminderCandidate[] }>(url, config);
      setLicenseCandidates(res.data?.sent || []);
    } catch (err: any) {
      console.error('❌ Error al consultar licencias por vencer:', err?.response?.data || err);
      toast.error(err?.response?.data?.message || 'Error al consultar licencias por vencer');
      setLicenseCandidates([]);
    } finally {
      setLoadingLicenses(false);
    }
  }, [getAuthHeaders]);

  // Datos detallados para mini-grilla
  const loadExpiringRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const config = getAuthHeaders();
      const url = `${process.env.REACT_APP_API_URL}/api/licenses/due?maxDays=${MAX_DAYS}`;
      const res = await axios.get<{ ok: boolean; rows: InspectRow[] }>(url, config);
      const rows = (res.data?.rows || [])
        .map(r => r);
      setExpiringRows(rows);
    } catch (e: any) {
      console.error('❌ Error al cargar mini-grilla:', e?.response?.data || e);
      toast.error(e?.response?.data?.message || 'Error al cargar próximas licencias');
      
      setExpiringRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, [getAuthHeaders]);

  const sendLicenseReminders = useCallback(async () => {
    if (userRank === ranks.GUEST) {
      toast.warn('No tenés permisos para enviar recordatorios');
      return;
    }
    try {
      const config = getAuthHeaders();
      const url = `${process.env.REACT_APP_API_URL}/api/licenses/run-reminders?maxDays=${MAX_DAYS}`;
      const res = await axios.get<{ ok: boolean; sent: LicenseReminderCandidate[] }>(url, config);

      const total = res.data?.sent?.filter(i => !i.skipped)?.length || 0;
      const skipped = res.data?.sent?.filter(i => i.skipped === 'duplicate')?.length || 0;

      if (total > 0) {
        toast.success(`Recordatorios enviados al grupo: ${total} (omitidos por duplicado: ${skipped})`);
      } else {
        toast.info(`No hay clientes con ≤ ${MAX_DAYS} días (omitidos: ${skipped})`);
      }

      // Post-envío refrescamos todo
      await Promise.all([loadLicenseCandidates(), loadExpiringRows()]);
    } catch (err: any) {
      console.error('❌ Error al enviar recordatorios:', err?.response?.data || err);
      toast.error(err?.response?.data?.message || 'Error al enviar recordatorios');
    }
  }, [getAuthHeaders, loadLicenseCandidates, loadExpiringRows, userRank]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, userId]);

  useEffect(() => {
    // Cargar candidatos + mini-grilla al montar
    loadLicenseCandidates();
    loadExpiringRows();
  }, [loadLicenseCandidates, loadExpiringRows]);

  if (loading) return <Spinner />;

  const shortcuts: Shortcut[] = [
    {
      to: '/users',
      title: 'Usuarios',
      description: `${stats.users} registrados`,
      icon: <FaUser />,
      bg: 'linear-gradient(135deg, #2457a9ff, #132972ff)',
      show: ['CEO', 'Jefe de Consultoría'].includes(userRank)
    },
    {
      to: '/clients',
      title: 'Clientes',
      description: `${stats.clients} activos`,
      icon: <FaUsers />,
      bg: 'linear-gradient(135deg, #0f5b42ff, #355149ff)'
    },
    {
      to: '/incidents',
      title: 'Incidencias',
      description: `${stats.incidents} pendientes`,
      icon: <FaBug />,
      bg: 'linear-gradient(135deg, #865a10ff, #886952ff)',
      show: ['CEO', 'Jefe de Consultoría'].includes(userRank)
    },
    {
      to: '/assistances',
      title: 'Asistencias',
      description: asistenciaStats
        ? `${stats.assistances} registradas • ${asistenciaStats.cantidadHoy} hoy • ${asistenciaStats.totalHorasHoy}h`
        : `${stats.assistances} registradas`,
      icon: <FaClipboardCheck />,
      bg: 'linear-gradient(135deg, #252665ff, #312b98ff)'
    },
    {
      to: '/pending-tasks',
      title: 'Pendientes',
      description: `${stats.pendings} en espera`,
      icon: <FaChartPie />,
      bg: 'linear-gradient(135deg, #45132cff, #db2777)'
    }
  ];

  return (
    <div className={styles.container} data-theme={theme}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📊 Consultoría Mantis 📊</h1>
          <p className={styles.subtitle}>
            Accedé a tus herramientas de control en un solo lugar.
          </p>
        </div>
        {userRank === ranks.TOTALACCESS && (
          <div className={styles.headerAction}>
            <button className={styles.meetBtn} onClick={() => setModalOpen(true)}>
              <FaVideo className={styles.meetIcon} /> Crear Reunión
            </button>
          </div>
        )}
      </header>

      {/* Atajos (solo íconos) */}
      <section className={styles.shortcuts}>
        {shortcuts.map(
          (s, i) =>
            (s.show === undefined || s.show) && (
              <Link
                key={i}
                to={s.to}
                className={styles.shortcutCard}
                style={{ backgroundImage: s.bg }}
                aria-label={`${s.title}: ${s.description}`}
                title={`${s.title}: ${s.description}`}
              >
                <div className={styles.shortcutIcon}>{s.icon}</div>
              </Link>
            )
        )}
      </section>

      {/* Bloque Licencias por vencer (≤15 días) */}
      <section className={styles.ChartsContainer}>
        <div className={styles.chartsGrid}>
          <div className={styles.card} aria-live="polite">
            <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Licencias por vencer (≤ {MAX_DAYS} días)</h3>
              <span
                className={(styles as any).badge ?? ''}
                aria-label={`Clientes a notificar: ${loadingLicenses ? '...' : licenseCount}`}
                title={`Clientes a notificar: ${loadingLicenses ? '...' : licenseCount}`}
              >
                {loadingLicenses ? '...' : licenseCount}
              </span>
            </div>

            <div className={styles.cardBody}>
              <p style={{ marginTop: 8, marginBottom: 12 }}>
                {loadingLicenses
                  ? 'Consultando clientes...'
                  : licenseCount > 0
                    ? 'Hay clientes por vencer. Podés enviar el recordatorio al grupo ahora.'
                    : 'No hay clientes con ≤ 15 días para vencer.'}
              </p>

              {/* Acción rápida */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={async () => { await Promise.all([loadLicenseCandidates(), loadExpiringRows()]); }}
                  disabled={loadingLicenses || loadingRows}
                  className={(styles as any).applyBtn ?? styles.meetBtn}
                  aria-label="Actualizar lista de licencias por vencer"
                >
                  {(loadingLicenses || loadingRows) ? 'Actualizando...' : 'Actualizar'}
                </button>

                <button
                  type="button"
                  onClick={sendLicenseReminders}
                  disabled={loadingLicenses || licenseCount === 0}
                  className={styles.meetBtn}
                  aria-label="Enviar recordatorios al grupo de WhatsApp"
                  title="Enviar recordatorios (grupo)"
                >
                  Enviar recordatorios (grupo)
                </button>

                <Link
                  to="/clients"
                  className={(styles as any).linkBtn ?? styles.meetBtn}
                  aria-label="Ir a Clientes"
                  style={{ textDecoration: 'none', paddingInline: 12, display: 'inline-flex', alignItems: 'center', borderRadius: 8 }}
                >
                  Ver clientes
                </Link>
              </div>

              {/* Mini grilla dinámica */}
              <div role="region" aria-label="Próximas licencias a vencer" className={styles.miniTableWrap}>
                <table className={styles.miniTable ?? ''}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Común</th>
                      <th style={{ textAlign: 'left' }}>Cliente</th>
                      <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Días</th>
                      <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Vence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingRows ? (
                      <tr><td colSpan={4} style={{ padding: 8 }}>Cargando...</td></tr>
                    ) : expiringRows.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 8 }}>Sin próximos a vencer en ≤ {MAX_DAYS} días.</td></tr>
                    ) : (
                      expiringRows.slice(0, VISIBLE_ROWS).map((r, idx) => (
                        <tr key={`${r.common || r.name}-${idx}`}>
                          <td style={{ padding: '6px 8px' }}>{r.common || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{r.name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.diasRestantes}</td>
                          <td style={{ padding: '6px 8px' }}>
                            {r.vence ? new Date(r.vence).toLocaleDateString('es-AR') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Pie de tabla */}
                {expiringRows.length > VISIBLE_ROWS && (
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    Mostrando {VISIBLE_ROWS} de {expiringRows.length}. Abrí <Link to="/clients">Clientes</Link> para ver todo.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* espacio para futuros charts */}
          {/* <LicenseExpirationsChart cycleDays={62} defaultRange={60} /> */}
          {/* <AssistanceChart /> */}
        </div>
      </section>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Crear Reunión Google Meet">
        <CrearMeetForm onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard;
