import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { type Assistance, Client, User, DecodedToken } from '../../utils/interfaces';
import styles from './Assistance.module.css';
import CustomTable from '../CustomTable/CustomTable';
import { ranks } from '../../utils/enums';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa'; // Agregado FaPlus para Nueva Asistencia
import Modal from '../Modal/Modal';

const Assistances: React.FC = () => {
  const [assistances, setAssistances] = useState<Assistance[]>([]);
  const [error, setError] = useState<string>('');
  const [editingAssistance, setEditingAssistance] = useState<Assistance | null>(null);
  const [newAssistance, setNewAssistance] = useState<Assistance>({
    _id: '', clientId: '', userId: '', date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0,
    incidentId: null, pendingId: null,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRank, setUserRank] = useState<string>('');
  const [loggedInUserId, setLoggedInUserId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return setError('No token found in localStorage');
    try {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
      setLoggedInUserId(decoded.id);
      setNewAssistance(prev => ({ ...prev, userId: decoded.id }));
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      setError('Token inválido o corrupto');
    }

    const fetchData = async () => {
      try {
        const [clientsRes, usersRes, assistancesRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/assistances`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
        setAssistances(assistancesRes.data);
      } catch (err: any) {
        console.error('Fetch Error:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Error al cargar datos');
      }
    };
    if (userRank && !error) fetchData();
  }, [userRank, error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAssistance(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return setError('No token available for submission');

    if (!newAssistance.clientId || !newAssistance.detail || !newAssistance.contact || !newAssistance.timeSpent) {
      return setError('Faltan campos requeridos');
    }

    const assistanceToSend = { ...newAssistance, userId: loggedInUserId };
    try {
      if (editingAssistance) {
        const res = await axios.put(`${process.env.REACT_APP_API_URL}/api/assistances/${editingAssistance._id}`, assistanceToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssistances(assistances.map(a => (a._id === editingAssistance._id ? res.data : a)));
        setEditingAssistance(null);
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/assistances`, assistanceToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssistances([...assistances, res.data]);
      }
      setShowAddForm(false);
      setNewAssistance({ _id: '', clientId: '', userId: loggedInUserId, date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0, incidentId: null, pendingId: null });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar asistencia');
    }
  };

  // Función para manejar edición (usada en Modificar y Asignar)
  const handleEdit = useCallback((assistance: Assistance, assignOnly: boolean = false) => {
    if (userRank !== ranks.TOTALACCESS) {
      setError('No tienes permisos para editar');
      return;
    }
    setEditingAssistance(assistance);
    setNewAssistance(assistance);
    setShowAddForm(true);
  }, [userRank]);

  // Nueva función para manejar Nueva Asistencia
  const handleNewAssistance = useCallback(() => {
    if (userRank !== ranks.TOTALACCESS) {
      setError('No tienes permisos para crear asistencias');
      return;
    }
    setEditingAssistance(null);
    setNewAssistance({ _id: '', clientId: '', userId: loggedInUserId, date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0, incidentId: null, pendingId: null });
    setShowAddForm(true);
  }, [userRank, loggedInUserId]);

  // Función para eliminar
  const handleDelete = useCallback(async (assistance: Assistance) => {
    if (userRank !== ranks.TOTALACCESS) {
      setError('No tienes permisos para eliminar');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta asistencia?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/assistances/${assistance._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssistances(assistances.filter(a => a._id !== assistance._id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar asistencia');
    }
  }, [assistances, userRank]);

  // Actualizado: Agregar Nueva Asistencia al menú contextual
  const getRowContextMenu = (row: Assistance) => [
    {
      label: ' Nueva Asistencia',
      icon: <FaPlus />,
      onClick: handleNewAssistance
    },
    {
      label: ' Modificar',
      icon: <FaEdit />,
      onClick: () => handleEdit(row)
    },
    {
      label: ' Eliminar',
      icon: <FaTrash />,
      onClick: () => handleDelete(row),
      disabled: userRank !== ranks.TOTALACCESS,
    }
  ];

  const getClientName = (clientId: string | null) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : 'Desconocido';
  };

  const getUserName = (userId: string | null) => {
    const user = users.find(u => u._id === userId);
    return user ? user.username : 'Desconocido';
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Asistencias</h1>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.fab} title="Agregar Asistencia" onClick={() => {
        setEditingAssistance(null);
        setNewAssistance({ _id: '', clientId: '', userId: loggedInUserId, date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0, incidentId: null, pendingId: null });
        setShowAddForm(true);
      }}>+</button>
      <div style={{ width: '100%' }}>
        <CustomTable
          rowData={assistances}
          columnDefs={[
            { field: 'clientId', headerName: 'Cliente', valueFormatter: (value) => getClientName(value), sortable: true, filterable: true },
            { field: 'userId', headerName: 'Usuario', valueFormatter: (value) => getUserName(value), sortable: true, filterable: true },
            { field: 'date', headerName: 'Fecha', valueFormatter: (value) => new Date(value).toLocaleDateString(), sortable: true, filterable: true },
            { field: 'detail', headerName: 'Detalle', sortable: true, filterable: true },
            { field: 'contact', headerName: 'Contacto', sortable: true, filterable: true },
            { field: 'timeSpent', headerName: 'Tiempo Gastado (min)', sortable: true, filterable: true },
            { field: 'sequenceNumber', headerName: 'Número', valueFormatter: (v) => v || 'Sin número asignado', sortable: true, filterable: true },
          ]}
          pagination={true}
          defaultPageSize={15}
          searchable={true}
          customizable={true}
          storageKey="assistanceTable"
          onRowContextMenu={getRowContextMenu}
        />
      </div>
      <Modal
        isOpen={showAddForm && userRank === ranks.TOTALACCESS}
        onClose={() => setShowAddForm(false)}
        title={editingAssistance ? 'Editar Asistencia' : 'Agregar Asistencia'}
      >
        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
            <label>Cliente *</label>
            <select name="clientId" value={newAssistance.clientId || ''} onChange={handleInputChange} required>
              <option value="">Seleccione un cliente</option>
              {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
            </select>
          </div>
          <div className="formGroup">
            <label>Usuario *</label>
            <select name="userId" value={newAssistance.userId || ''} onChange={handleInputChange} required>
              <option value="">Seleccione un usuario</option>
              {users.map((user) => <option key={user._id} value={user._id}>{user.username}</option>)}
            </select>
          </div>
          <div className="formGroup">
            <label>Fecha</label>
            <input type="date" name="date" value={new Date(newAssistance.date).toISOString().split('T')[0]} onChange={handleInputChange} required />
          </div>
          <div className="formGroup">
            <label>Detalle *</label>
            <textarea name="detail" value={newAssistance.detail || ''} onChange={handleInputChange} required />
          </div>
          <div className="formGroup">
            <label>Contacto *</label>
            <input type="text" name="contact" value={newAssistance.contact || ''} onChange={handleInputChange} required />
          </div>
          <div className="formGroup">
            <label>Tiempo Gastado (min) *</label>
            <input type="number" name="timeSpent" value={newAssistance.timeSpent} onChange={handleInputChange} required />
          </div>
          <button type="submit">{editingAssistance ? 'Actualizar' : 'Crear Asistencia'}</button>
        </form>
      </Modal>
    </div>
  );
};

export default Assistances;