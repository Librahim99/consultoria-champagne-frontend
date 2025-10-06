import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Spinner/Spinner';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { FaUsers, FaChartPie } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './Dashboard.module.css';

// Solo necesitamos estos contadores
interface Stats {
  clients: number;
  pendings: number;
}

interface Shortcut {
  to: string;
  title: string;
  description: string;
  icon: JSX.Element;
  bg: string;
}

const Dashboard: React.FC = () => {
  const { userId } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);

  const [stats, setStats] = useState<Stats>({
    clients: 0,
    pendings: 0
  });
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No se encontró token');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  // Solo consultamos endpoints permitidos: clients y pending
  const fetchStats = useCallback(async () => {
    try {
      const config = getAuthHeaders();
      const endpoints = ['clients', 'pending'];
      const [clientsRes, pendingRes] = await Promise.all(
        endpoints.map((endpoint) =>
          axios.get(`${process.env.REACT_APP_API_URL}/api/${endpoint}`, config)
        )
      );
      setStats({
        clients: clientsRes.data.length ?? 0,
        pendings: pendingRes.data.length ?? 0
      });
    } catch (error: any) {
      console.error('❌ Error al obtener estadísticas:', error?.response?.data || error);
      toast.error('Error al obtener estadísticas');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, userId]);

  if (loading) return <Spinner />;

  // Solo dos atajos
  const shortcuts: Shortcut[] = [
    {
      to: '/clients',
      title: 'Clientes',
      description: `${stats.clients} activos`,
      icon: <FaUsers />,
      bg: 'linear-gradient(135deg, #0f5b42ff, #355149ff)'
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
          <h1 className={styles.title}>📊 Consultoría / Administración / Customer Care Mantis IT📊</h1>
          <p className={styles.subtitle}>
            Gestioná todo desde una sola web.
          </p>
        </div>
      </header>

      {/* Atajos (solo íconos) */}
      <section className={styles.shortcuts}>
        {shortcuts.map((s, i) => (
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
        ))}
      </section>
    </div>
  );
};

export default Dashboard;
