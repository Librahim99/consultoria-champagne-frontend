import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { ranks } from '../../utils/enums';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { User, DecodedToken } from '../../utils/interfaces';
import styles from './Users.module.css';
import { jwtDecode } from 'jwt-decode';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ username: '', password: '', rank: '' });
  const [showEditForm, setShowEditForm] = useState(false);
  const [userRank, setUserRank] = useState<string>('');
  const gridRef = useRef<AgGridReact>(null);

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

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', rank: user.rank });
    setShowEditForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_URL}/api/users/${editingUser._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const res = await axios.get<User[]>(`${process.env.REACT_APP_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setEditingUser(null);
      setFormData({ username: '', password: '', rank: '' });
      setShowEditForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar usuario');
    }
  };

  const toggleEditForm = () => {
    setShowEditForm(!showEditForm);
    if (!showEditForm) {
      setEditingUser(null);
      setFormData({ username: '', password: '', rank: '' });
    }
  };

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'username', headerName: 'Usuario', sortable: true, resizable: true },
      { field: 'rank', headerName: 'Rango', sortable: true, resizable: true },
      { field: 'entryDate', headerName: 'Fecha de Incorporación', sortable: true, resizable: true },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    const savedColumnOrder = localStorage.getItem('usersColumnOrder');
    if (savedColumnOrder) {
      const columnState: ColumnState[] = JSON.parse(savedColumnOrder);
      params.api.applyColumnState({ state: columnState });
    }
    gridRef.current!.api.sizeColumnsToFit();
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem('usersColumnOrder', JSON.stringify(columnState));
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gestión de Usuarios</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === 'Acceso Total' && (
        <button onClick={toggleEditForm} className={styles.button}>
          {showEditForm ? 'Cancelar' : 'Editar Usuario'}
        </button>
      )}
      <div className={styles.gridWrapper}>
        <AgGridReact
          ref={gridRef}
          rowData={users}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          animateRows={true}
          domLayout='autoHeight'
          className={styles.agGrid}
        />
      </div>
      {showEditForm && editingUser && userRank === 'Acceso Total' && (
        <div className={styles.formContainer}>
          <h2>Editar Usuario: {editingUser.username}</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Usuario</label>
              <input type="text" name="username" value={formData.username} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Contraseña (dejar en blanco para no cambiar)</label>
              <input type="password" name="password" value={formData.password} onChange={handleInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Rango</label>
              <select name="rank" value={formData.rank} onChange={handleInputChange} required>
                {Object.values(ranks).map((rank) => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.button}>Guardar Cambios</button>
            <button
              type="button"
              onClick={toggleEditForm}
              className={`${styles.button} ${styles.cancelButton}`}
            >
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Users;