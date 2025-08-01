// ✅ Users.tsx con tipado correcto, gráfico, acción rápida, exportación CSV y sin errores de compilación

import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { ranks } from '../../utils/enums';
import { User, DecodedToken } from '../../utils/interfaces';
import styles from './Users.module.css';
import { jwtDecode } from 'jwt-decode';
import { ThemeContext } from '../../contexts/ThemeContext';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import EditUserModal from './EditUserModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

interface UserMetrics {
  asignados: number;
  abiertos: number;
  cerrados: number;
  promedioResolucion: number;
  diasActivos: number;
  ultimoCierre: string | null;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userMetricsMap, setUserMetricsMap] = useState<Record<string, UserMetrics>>({});
  const { theme } = useContext(ThemeContext);
  const [error, setError] = useState<string>('');
  const [userRank, setUserRank] = useState<string>('');
  const [filter, setFilter] = useState<string>('');
  const [modalUser, setModalUser] = useState<User | null>(null);

  const fetchUserMetrics = async (userId: string): Promise<UserMetrics | null> => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${userId}/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data as UserMetrics;
    } catch (err) {
      console.error(`Error al traer métricas de usuario ${userId}:`, err);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = jwtDecode<DecodedToken>(token);
      setUserRank(decoded.rank);
    }

    const fetchUsers = async () => {
      try {
        const res = await axios.get<User[]>(`${process.env.REACT_APP_API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);

        const metricsMap: Record<string, UserMetrics> = {};
        await Promise.all(
          res.data.map(async (user: User) => {
            const metrics = await fetchUserMetrics(user._id);
            if (metrics) metricsMap[user._id] = metrics;
          })
        );
        setUserMetricsMap(metricsMap);
      } catch (err) {
        setError('Error al cargar usuarios');
      }
    };

    fetchUsers();
  }, []);

  const openEditModal = (user: User) => {
    setModalUser(user);
  };

  const closeModal = () => {
    setModalUser(null);
  };

  const handleUserUpdate = async (updatedUser: {
    username: string;
    number: string;
    rank: string;
  }) => {
    if (!modalUser) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/users/${modalUser._id}`,
        updatedUser,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(prev =>
        prev.map(u =>
          u._id === modalUser._id ? { ...u, ...updatedUser } : u
        )
      );
      closeModal();
    } catch (err) {
      console.error('Error actualizando usuario', err);
    }
  };

  const sendWhatsAppReminder = (user: User) => {
    const message = encodeURIComponent(`Hola ${user.username}, te recordamos que tenés tickets pendientes por resolver.`);
    const phone = user.number?.replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/54${phone}?text=${message}`, '_blank');
    }
  };

  const exportCSV = () => {
    const rows = users.map(user => {
      const m = userMetricsMap[user._id];
      return {
        Usuario: user.username,
        Rol: user.rank,
        Número: user.number || '',
        Cerrados: m?.cerrados || 0,
        Asignados: m?.asignados || 0,
        PromedioResolucion: m?.promedioResolucion || 0,
        DíasActivos: m?.diasActivos || 0,
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'usuarios_metricas.csv');
  };
      const exportXLSX = () => {
    const rows = users.map(user => {
      const m = userMetricsMap[user._id];
      return {
        Usuario: user.username,
        Rol: user.rank,
        Número: user.number || '',
        Cerrados: m?.cerrados || 0,
        Asignados: m?.asignados || 0,
        PromedioResolucion: m?.promedioResolucion || 0,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    XLSX.writeFile(workbook, 'usuarios_metricas.xlsx');
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(filter.toLowerCase()) ||
    user.rank.toLowerCase().includes(filter.toLowerCase())
  );

  const chartData = users.map(user => ({
    name: user.username,
    Cerrados: userMetricsMap[user._id]?.cerrados || 0,
    Asignados: userMetricsMap[user._id]?.asignados || 0,
    Promedio: userMetricsMap[user._id]?.promedioResolucion || 0,
  }));

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>👥 Panel de Usuarios 👥</h1>
      <button onClick={exportCSV} className={styles.exportButton}>📤 Exportar CSV</button>
      <button onClick={exportXLSX} className={styles.exportButton}>📥 Exportar XLSX</button>
      {error && <p className={styles.error}>{error}</p>}

      <input
        type="text"
        placeholder="🔍 Buscar usuario o rol..."
        onChange={(e) => setFilter(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.chartCard}>
  <ResponsiveContainer width="100%" height={350}>
    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="Cerrados" stackId="a" fill="#28a745" />
      <Bar dataKey="Asignados" stackId="a" fill="#007bff" />
      <Bar dataKey="Promedio" fill="#ffc107" />
    </BarChart>
  </ResponsiveContainer>
</div>


      <div className={styles.userGrid}>
        {filteredUsers.map((user) => (
          <motion.div
            key={user._id}
            className={styles.userCard}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.avatar}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userHeader}>
              <h3>{user.username}</h3>
              <span className={`${styles.badge} ${styles.total}`}>{user.rank}</span>
            </div>
            <div className={styles.userDetails}>
              {user.number && <p>📱 {user.number}</p>}
              <p>🟢 Estado: {user.active ? 'Activo' : 'Inactivo'}</p>
              {user.lastLogin && <p>🕓 Último acceso: {new Date(user.lastLogin).toLocaleString()}</p>}
            </div>
            {userMetricsMap[user._id] && (
              <div className={styles.metrics}>
                <p>📌 Asignados: {userMetricsMap[user._id].asignados}</p>
                <p>✅ Cerrados: {userMetricsMap[user._id].cerrados}</p>
                <p>⏱️ Promedio: {Math.round(userMetricsMap[user._id].promedioResolucion)} min</p>
              </div>
            )}
            <div className={styles.actions}>
              <button onClick={() => openEditModal(user)} className={styles.iconButton}>
                <FaEdit />
              </button>
              <button className={styles.iconButton}>
                <FaTrash />
              </button>
              {user.number && userMetricsMap[user._id]?.abiertos > 5 && (
                <button
                  className={styles.reminderButton}
                  onClick={() => sendWhatsAppReminder(user)}
                >
                  📩 Recordatorio
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modalUser && (
          <EditUserModal
            user={modalUser}
            onCancel={closeModal}
            onSave={handleUserUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
