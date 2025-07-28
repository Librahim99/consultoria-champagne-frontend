import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Spinner/Spinner';
import { UserContext } from '../../contexts/UserContext';
import styles from './Dashboard.module.css';
import { ranks } from '../../utils/enums';
import { ThemeContext } from '../../contexts/ThemeContext';

const Dashboard: React.FC = () => {
  const { userRank, userId } = useContext(UserContext);
  const [stats, setStats] = useState({ users: 0, clients: 0, incidents: 0, pendings: 0, assistances: 0 });
  const [loading, setLoading] = useState(true);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchStats = async () => {
      try {
        const [usersRes, clientsRes, incidentsRes, pendingsRes, assistancesRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/pending`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/assistances`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setStats({
          users: usersRes.data.length,
          clients: clientsRes.data.length,
          incidents: incidentsRes.data.length,
          pendings: pendingsRes.data.length,
          assistances: assistancesRes.data.length,
        });
      } catch (err) {
        console.error('Error fetching stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  if (loading) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Portal de Gestión</h1>
      <div className={styles.grid}>
        {userRank !== ranks.GUEST && (
          <Link to="/users" className={styles.card}>
            <h2>Usuarios</h2>
            <p>{stats.users} usuarios registrados</p>
          </Link>
        )}
        <Link to="/clients" className={styles.card}>
          <h2>Clientes</h2>
          <p>{stats.clients} clientes activos</p>
        </Link>
        <Link to="/incidents" className={styles.card}>
          <h2>Incidencias</h2>
          <p>{stats.incidents} incidencias pendientes</p>
        </Link>
        {/* Similar para otros */}
      </div>
    </div>
  );
};

export default Dashboard;