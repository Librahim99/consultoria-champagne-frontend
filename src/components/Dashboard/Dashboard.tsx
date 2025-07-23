import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import styles from './Dashboard.module.css';

interface DecodedToken {
  rank: string;
}

const Dashboard: React.FC = () => {
  const [userRank, setUserRank] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Portal de Gestión</h1>
      <div className={styles.grid}>
        {userRank === 'Acceso Total' && (
          <Link to="/users" className={`${styles.card} ${styles.link}`}>
            <h2 className={styles.cardTitle}>Usuarios</h2>
            <p className={styles.preview}>
              Gestión de usuarios:
              <ul>
                <li>Usuario A: Acceso Total</li>
                <li>Usuario B: Consultor</li>
              </ul>
            </p>
          </Link>
        )}
        <Link to="/clients" className={`${styles.card} ${styles.link}`}>
          <h2 className={styles.cardTitle}>Clientes</h2>
          <p className={styles.preview}>
            Lista de clientes:
            <ul>
              <li>Cliente A: Activo, VIP</li>
              <li>Cliente B: Inactivo</li>
            </ul>
          </p>
        </Link>
        <Link to="/license-expirations" className={`${styles.card} ${styles.link}`}>
          <h2 className={styles.cardTitle}>Vencimientos de Licencia</h2>
          <p className={styles.preview}>
            Próximos vencimientos:
            <ul>
              <li>Cliente A: 15 días</li>
              <li>Cliente B: 30 días</li>
            </ul>
          </p>
        </Link>
        <Link to="/pending-tasks" className={`${styles.card} ${styles.link}`}>
          <h2 className={styles.cardTitle}>Pendientes</h2>
          <p className={styles.preview}>
            Tareas pendientes:
            <ul>
              <li>Cliente C: Revisar contrato</li>
              <li>Cliente D: Llamada de seguimiento</li>
            </ul>
          </p>
        </Link>
        <Link to="/assistances" className={`${styles.card} ${styles.link}`}>
          <h2 className={styles.cardTitle}>Asistencias</h2>
          <p className={styles.preview}>
            Asistencias de hoy:
            <ul>
              <li>Cliente E: Soporte técnico</li>
              <li>Cliente F: Capacitación</li>
            </ul>
          </p>
        </Link>
        <Link to="/incidents" className={`${styles.card} ${styles.link}`}>
          <h2 className={styles.cardTitle}>Incidencias</h2>
          <p className={styles.preview}>
            Pedidos a programación:
            <ul>
              <li>Incidencia #001: Bug en módulo X</li>
              <li>Incidencia #002: Nueva funcionalidad</li>
            </ul>
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;