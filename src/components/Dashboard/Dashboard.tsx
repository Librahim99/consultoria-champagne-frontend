import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Spinner/Spinner';
import Modal from '../Modal/Modal';
import CrearMeetForm from '../../components/GoogleAPIs/CrearMeetForm';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { ranks, UserRank } from '../../utils/enums';
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
import PendientesPorEstado from '../../components/Charts/PendientesPorEstadoChart';
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
  const [pendientesPorEstado, setPendientesPorEstado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const endpoints = ['users', 'clients', 'incidents', 'pending', 'assistances'];
      const responses = await Promise.all(
        endpoints.map(endpoint => axios.get(`${process.env.REACT_APP_API_URL}/api/${endpoint}`, config))
      );

      setStats({
        users: responses[0].data.length,
        clients: responses[1].data.length,
        incidents: responses[2].data.length,
        pendings: responses[3].data.length,
        assistances: responses[4].data.length
      });
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGraficos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [resInc, resAsis] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/incidents/metricas-dashboard`, config),
        axios.get(`${process.env.REACT_APP_API_URL}/api/pending/por-estado`, config)
      ]);

      setIncidentesPorDia(resInc.data.porDia || []);
      setPendientesPorEstado(resAsis.data || []);
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
  console.log("Incidentes por Día:", incidentesPorDia);
  console.log("Asistencias por Usuario:", asistenciasPorUsuario);
  console.log("Pendientes por Estado:", pendientesPorEstado);
}, [incidentesPorDia, asistenciasPorUsuario]);


  if (loading) return <Spinner />;

  const shortcuts: Shortcut[] = [
  {
    to: '/users',
    title: 'Usuarios',
    description: `${stats.users} registrados`,
    icon: <FaUser />,
    bg: 'linear-gradient(135deg, #1c4780ff, #1e3a8a)', // azul con profundidad
    show: ['CEO', 'Jefe de Consultoría'].includes(userRank)
  },
  {
    to: '/clients',
    title: 'Clientes',
    description: `${stats.clients} activos`,
    icon: <FaUsers />,
    bg: 'linear-gradient(135deg, #187f59ff, #065f46)' // verde esmeralda vibrante
  },
  {
    to: '/incidents',
    title: 'Incidencias',
    description: `${stats.incidents} pendientes`,
    icon: <FaBug />,
    bg: 'linear-gradient(135deg, #8f6e1cff, #92400e)', // dorado moderno
    show: ['CEO', 'Jefe de Consultoría'].includes(userRank)
  },
  {
    to: '/assistances',
    title: 'Asistencias',
    description: asistenciaStats
      ? `${stats.assistances} registradas • ${asistenciaStats.cantidadHoy} hoy • ${asistenciaStats.totalHorasHoy}h`
      : `${stats.assistances} registradas`,
    icon: <FaClipboardCheck />,
    bg: 'linear-gradient(135deg, #3c2277ff, #4c1d95)' // púrpura sofisticado
  },
  {
    to: '/pending-tasks',
    title: 'Pendientes',
    description: `${stats.pendings} en espera`,
    icon: <FaChartPie />,
    bg: 'linear-gradient(135deg, #521b38ff, #831843)' // fucsia elegante
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
         {userRank === ranks.TOTALACCESS && (<div className={styles.headerAction}>
          <button className={styles.meetBtn} onClick={() => setModalOpen(true)}>
            <FaVideo className={styles.meetIcon} /> Crear Reunión
          </button>
        </div>)}
      </header>

      <section className={styles.shortcuts} role="list">
  {shortcuts.map(
    (s, i) =>
      (s.show === undefined || s.show) && (
        <Link
          key={i}
          to={s.to}
          role="listitem"
          className={styles.shortcutCard}
          aria-label={`${s.title}: ${s.description}`}
          data-id={`shortcut-${s.title.toLowerCase().replace(/\s+/g, '-')}`}
          // En vez de backgroundImage directo, exponemos --bg (mantengo compat con backgroundImage por si lo preferís)
          style={{ ['--bg' as any]: s.bg, backgroundImage: s.bg }}
        >
          <span className={styles.shortcutIcon} aria-hidden="true">{s.icon}</span>
          <span className={styles.shortcutInfo}>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
          </span>
        </Link>
      )
  )}
</section>

      {/* 📊 Gráficos */}
      <section className={styles.charts}>
        <IncidentesPorDiaChart data={incidentesPorDia} />
        <AsistenciasPorUsuarioChart />
        <PendientesPorEstado data={pendientesPorEstado} />
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
