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

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { theme } = useContext(ThemeContext);
  const [error, setError] = useState<string>('');
  const [userRank, setUserRank] = useState<string>('');
  const [filter, setFilter] = useState<string>('');
  const [modalUser, setModalUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
    }

    const fetchUsers = async () => {
      try {
        const res = await axios.get<User[]>(`${process.env.REACT_APP_API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar usuarios');
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(filter.toLowerCase()) ||
    user.rank.toLowerCase().includes(filter.toLowerCase())
  );

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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>👥 Panel de Usuarios</h1>
      {error && <p className={styles.error}>{error}</p>}

      <input
        type="text"
        placeholder="🔍 Buscar usuario o rol..."
        onChange={(e) => setFilter(e.target.value)}
        className={styles.searchInput}
      />

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
              <span className={`${styles.badge} ${
                user.rank === ranks.ADMIN ? styles.admin :
                user.rank === ranks.GUEST ? styles.guest :
                styles.total
              }`}>{user.rank}</span>
            </div>
            {user.entryDate && (
              <p className={styles.userDate}>📅 {new Date(user.entryDate).toLocaleDateString()}</p>
            )}
            <div className={styles.userDetails}>
              {user.number && <p>📱 {user.number}</p>}
              <p>🟢 Estado: {user.active ? 'Activo' : 'Inactivo'}</p>
              {user.lastLogin && <p>🕓 Último acceso: {new Date(user.lastLogin).toLocaleString()}</p>}
            </div>
            <div className={styles.actions}>
              <button onClick={() => openEditModal(user)} className={styles.iconButton}>
                <FaEdit />
              </button>
              <button className={styles.iconButton}>
                <FaTrash />
              </button>
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
