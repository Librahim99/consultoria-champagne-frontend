import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Spinner/Spinner';
import Modal from '../Modal/Modal';
import CrearMeetForm from '../../components/GoogleAPIs/CrearMeetForm';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { UserRank } from '../../utils/enums';
import PendientesPorEstadoChart from '../../components/Charts/PendientesPorEstadoChart';
import {
  FaUser,
  FaBug,
  FaClipboardCheck,
  FaUsers,
  FaVideo,
  FaChartPie
} from 'react-icons/fa';
import styles from './Dashboard.module.css';
import PendientesPorUsuarioChart from '../../components/Charts/PendientesPorUsuarioChart';
import IncidentesPorDiaChart from '../../components/Charts/IncidentesPorDiaChart';
import AsistenciasPorUsuarioChart from '../../components/Charts/AsistenciasPorUsuarioChart';

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
  const [incidentesPorDia, setIncidentesPorDia] = useState([]);
  const [asistenciasPorUsuario, setAsistenciasPorUsuario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchStats = useCallback(async () => {
  try {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const endpoints = ['users', 'clients', 'incidents', 'pending', 'assistances'];
    const responses = await Promise.all(
      endpoints.map(endpoint =>
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

    const asistenciaExtra = await axios.get(
      `${process.env.REACT_APP_API_URL}/api/assistances/dashboard/asistencias`,
      config
    );
    setAsistenciaStats(asistenciaExtra.data);
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
  } finally {
    setLoading(false);
  }
}, []);

 const [pendientesPorUsuario, setPendientesPorUsuario] = useState([]);
const [pendientesPorEstado, setPendientesPorEstado] = useState([]);

const fetchGraficos = useCallback(async () => {
  try {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const [resInc, resAsis, resPend] = await Promise.all([
      axios.get(`${process.env.REACT_APP_API_URL}/api/incidents/metricas-dashboard`, config),
      axios.get(`${process.env.REACT_APP_API_URL}/api/assistances/por-usuario`, config),
      axios.get(`${process.env.REACT_APP_API_URL}/api/pending/metricas-dashboard`, config)
    ]);

    setIncidentesPorDia(resInc.data.porDia || []);
    setAsistenciasPorUsuario(resAsis.data || []);
    setPendientesPorUsuario(resPend.data.porUsuario || []);
    setPendientesPorEstado(resPend.data.porEstado || []);
  } catch (error) {
    console.error('❌ Error al cargar gráficos:', error);
  }
}, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, userId]);

  useEffect(() => {
    fetchGraficos();
  }, [fetchGraficos]);


useEffect(() => {
  console.log("🎯 incidentesPorDia", incidentesPorDia);
  console.log("🎯 asistenciasPorUsuario", asistenciasPorUsuario);
  console.log("🎯 pendientesPorUsuario", pendientesPorUsuario);
  console.log("🎯 pendientesPorEstado", pendientesPorEstado);
}, [incidentesPorDia, asistenciasPorUsuario, pendientesPorUsuario, pendientesPorEstado]);



  if (loading) return <Spinner />;

  const shortcuts: Shortcut[] = [
    {
      to: '/users',
      title: 'Usuarios',
      description: `${stats.users} registrados`,
      icon: <FaUser />,
      bg: 'linear-gradient(135deg, #3b82f6, #1e40af)',
      show: ['CEO', 'Jefe de Consultoría'].includes(userRank)
    },
    {
      to: '/clients',
      title: 'Clientes',
      description: `${stats.clients} activos`,
      icon: <FaUsers />,
      bg: 'linear-gradient(135deg, #10b981, #047857)'
    },
    {
      to: '/incidents',
      title: 'Incidencias',
      description: `${stats.incidents} pendientes`,
      icon: <FaBug />,
      bg: 'linear-gradient(135deg, #f59e0b, #b45309)'
    },
    {
  to: '/assistances',
  title: 'Asistencias',
  description: asistenciaStats
    ? `${stats.assistances} registradas • ${asistenciaStats.cantidadHoy} hoy • ${asistenciaStats.totalHorasHoy}h`
    : `${stats.assistances} registradas`,
  icon: <FaClipboardCheck />,
  bg: 'linear-gradient(135deg, #6366f1, #4f46e5)'
},
    {
      to: '/pending-tasks',
      title: 'Pendientes',
      description: `${stats.pendings} en espera`,
      icon: <FaChartPie />,
      bg: 'linear-gradient(135deg, #ec4899, #db2777)'
    }
  ];

  return (
    <div className={styles.container} data-theme={theme}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>📊 Portal de Gestión Mantis 📊</h1>
          <p className={styles.subtitle}>
            Accedé a tus herramientas de control en un solo lugar.
          </p>
        </div>
        <div className={styles.headerAction}>
          <button className={styles.meetBtn} onClick={() => setModalOpen(true)}>
            <FaVideo className={styles.meetIcon} /> Crear Reunión
          </button>
        </div>
      </header>

      <section className={styles.shortcuts}>
        {shortcuts.map(
          (s, i) =>
            (s.show === undefined || s.show) && (
              <Link
                key={i}
                to={s.to}
                className={styles.shortcutCard}
                style={{ backgroundImage: s.bg }}
              >
                <div className={styles.shortcutIcon}>{s.icon}</div>
                <div className={styles.shortcutInfo}>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                </div>
              </Link>
            )
        )}
      </section>

      {/* 📊 Gráficos */}
      <section className={styles.chartsGrid}>
  <div className={styles.chartCard}>
    <h3>🙋‍♂️ Asistencias por Usuario</h3>
    <AsistenciasPorUsuarioChart data={asistenciasPorUsuario} />
  </div>
  <div className={styles.chartCard}>
    <h3>📌 Pendientes por Estado</h3>
    <PendientesPorEstadoChart data={pendientesPorEstado} />
  </div>
</section>
      {/* 📅 Modal de Google Meet */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Crear Reunión Google Meet"
      >
        <CrearMeetForm onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard;
