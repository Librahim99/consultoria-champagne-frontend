import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import axios from 'axios';
import { ranks } from '../../utils/enums';
import { User, DecodedToken } from '../../utils/interfaces';
import styles from './Users.module.css';
import { jwtDecode } from 'jwt-decode';
import { ThemeContext } from '../../contexts/ThemeContext';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { theme } = useContext(ThemeContext);
  const [error, setError] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ username: '', password: '', rank: '' });
  const [showEditForm, setShowEditForm] = useState(false);
  const [userRank, setUserRank] = useState<string>('');

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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gestión de Usuarios</h1>
      
    </div>
  );
};

export default Users;