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

// Tipos suaves para datos de métricas
type IncidenteDia = { fecha?: string; count?: number } | Record<string, any>;
type PendingEstado = { estado?: string; count?: number } | Record<string, any>;

const BarRow: React.FC<{
  label: string;
  value: number;
  max: number;
  title?: string;
}> = ({ label, value, max, title }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.barRow} role="group" aria-label={label} title={title || label}>
      <div className={styles.barLabel}>{label}</div>
      <div className={styles.barTrack} aria-hidden="true">
        <div
          className={styles.barFill}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${value}`}
        />
      </div>
      <div className={styles.barValue}>{value}</div>
    </div>
  );
};

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

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

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
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);



  useEffect(() => {
    fetchStats();
  }, [fetchStats, userId]);

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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Crear Reunión Google Meet">
        <CrearMeetForm onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard;
