import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { incident_status, ranks } from '../../utils/enums';
import { ThemeContext } from '../../contexts/ThemeContext';
import { type Pending, Client, User, DecodedToken, Assistance } from '../../utils/interfaces';
import styles from './Pending.module.css';
import CustomTable from '../CustomTable/CustomTable';
import { useContextMenu } from '../../contexts/UseContextMenu';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaWhatsapp, FaPlus, FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal';

// Función para mapear valores legibles a claves del enum
const mapStatusToKey = (value: string): keyof typeof incident_status | '' => {
  const entry = Object.entries(incident_status).find(([_, val]) => val === value);
  return entry ? entry[0] as keyof typeof incident_status : '';
};

const PendingTask: React.FC = () => {
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [error, setError] = useState<string>('');
  const { showMenu } = useContextMenu();
  const { theme } = useContext(ThemeContext);
  const [editingPending, setEditingPending] = useState<Pending | null>(null);
  const [newPending, setNewPending] = useState<Pending>({
    _id: '',
    clientId: '',
    date: new Date().toISOString(),
    status: 'Pendiente', // Valor legible por defecto
    detail: '',
    observation: null,
    incidentId: null,
    userId: '',
    assignedUserId: null,
    completionDate: null,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRank, setUserRank] = useState<string>('');
  const [loggedInUserId, setLoggedInUserId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No token found in localStorage');
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
      setLoggedInUserId(decoded.id);
      setNewPending(prev => ({ ...prev, userId: decoded.id }));
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      setError('Token inválido o corrupto');
    }

    const fetchData = async () => {
      try {
        const [clientsRes, usersRes, pendingsRes] = await Promise.all([
          axios.get<Client[]>(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<User[]>(`${process.env.REACT_APP_API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<Pending[]>(`${process.env.REACT_APP_API_URL}/api/pending`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
        setPendings(pendingsRes.data);
      } catch (err: any) {
        console.error('Fetch Error Details:', err.response?.data || err.message, err.response?.status);
        setError(err.response?.data?.message || 'Error al cargar datos');
      }
    };
    if (userRank && !error) fetchData();
  }, [userRank, error]);

  const handleEdit = useCallback((pending: Pending) => {
  if (userRank !== ranks.TOTALACCESS) {
    setError('No tienes permisos para editar');
    return;
  }
  // Mapear status a valor legible, con fallback a 'Pendiente'
  const statusValue = pending.status && incident_status[pending.status as keyof typeof incident_status] 
    ? incident_status[pending.status as keyof typeof incident_status] 
    : 'Pendiente';
  // Inicializar newPending con fallbacks para evitar null/undefined
  setNewPending({
    _id: pending._id || '',
    clientId: pending.clientId || '',
    userId: pending.userId || loggedInUserId,
    date: pending.date ? new Date(pending.date).toISOString() : new Date().toISOString(),
    status: statusValue,
    detail: pending.detail || '',
    observation: pending.observation || null,
    incidentId: pending.incidentId || null,
    assignedUserId: pending.assignedUserId || null,
    completionDate: pending.completionDate || null,
  });
  setEditingPending(pending);
  setShowAddForm(true);
}, [userRank, loggedInUserId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPending(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No token available for submission');
      return;
    }

    if (!newPending.clientId || !newPending.detail) {
      setError('Faltan campos requeridos: Cliente o Detalle');
      return;
    }

    const statusKey = mapStatusToKey(newPending.status);
    if (!statusKey) {
      setError('Estado no válido');
      return;
    }

    try {
  if (editingPending) {
    const res = await axios.put(`${process.env.REACT_APP_API_URL}/api/pending/${editingPending._id}`, { ...newPending, status: statusKey }, {
      headers: { Authorization: `Bearer ${token}` },
    });
        // Normalizar datos recibidos para alinear con interfaz Pending
    const updatedPending: Pending = {
      _id: res.data._id || editingPending._id,
      clientId: res.data.clientId || '',
      userId: res.data.userId || loggedInUserId,
      date: res.data.date ? new Date(res.data.date).toISOString() : new Date().toISOString(),
      status: res.data.status ? incident_status[res.data.status as keyof typeof incident_status] || res.data.status : 'Pendiente',
      detail: res.data.detail || '',
      observation: res.data.observation || null,
      incidentId: res.data.incidentId || null,
      assignedUserId: res.data.assignedUserId || null,
      completionDate: res.data.completionDate || null,
    };
    setPendings(pendings.map(p => (p._id === editingPending._id ? updatedPending : p)));
    setEditingPending(null);
    toast.success('Tarea pendiente actualizada');
  } else {
    const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/pending`, { ...newPending, status: statusKey }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Normalizar datos para nuevo pendiente
    const newPendingData: Pending = {
      _id: res.data._id || '',
      clientId: res.data.clientId || '',
      userId: res.data.userId || loggedInUserId,
      date: res.data.date ? new Date(res.data.date).toISOString() : new Date().toISOString(),
      status: res.data.status ? incident_status[res.data.status as keyof typeof incident_status] || res.data.status : 'Pendiente',
      detail: res.data.detail || '',
      observation: res.data.observation || null,
      incidentId: res.data.incidentId || null,
      assignedUserId: res.data.assignedUserId || null,
      completionDate: res.data.completionDate || null,
    };
    setPendings([...pendings, newPendingData]);
    toast.success('Tarea pendiente creada');
  }
  setShowAddForm(false);
  setNewPending({
    _id: '',
    clientId: '',
    date: new Date().toISOString(),
    status: 'Pendiente',
    detail: '',
    observation: null,
    incidentId: null,
    userId: loggedInUserId,
    assignedUserId: null,
    completionDate: null,
  });
} catch (err: any) {
  setError(err.response?.data?.message || 'Error al guardar pendiente');
}
  };

  const handleDelete = useCallback(async (pending: Pending) => {
    if (userRank !== ranks.TOTALACCESS) {
      setError('No tienes permisos para eliminar');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta tarea pendiente?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/pending/${pending._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendings(pendings.filter(p => p._id !== pending._id));
      toast.success('Tarea eliminada');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar tarea');
    }
  }, [pendings, userRank]);

  const handleNewPending = useCallback(() => {
    if (userRank !== ranks.TOTALACCESS) {
      setError('No tienes permisos para crear');
      return;
    }
    setEditingPending(null);
    setNewPending({
      _id: '',
      clientId: '',
      date: new Date().toISOString(),
      status: 'Pendiente',
      detail: '',
      observation: null,
      incidentId: null,
      userId: loggedInUserId,
      assignedUserId: null,
      completionDate: null,
    });
    setShowAddForm(true);
  }, [userRank, loggedInUserId]);

  const handleSendWhatsapp = useCallback(async (pending: Pending) => {
  if (!window.confirm('¿Enviar resumen al creador vía WhatsApp?')) return;
  try {
    await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/sendPending`, { pendingId: pending._id, targetUserId: pending.userId });
    toast.success('Resumen enviado al creador');
  } catch (err) {
    toast.error('Error al enviar resumen');
  }
}, []);

  const handleSendWhatsappToUser = useCallback(async (pending: Pending, user: User) => {
  if (!window.confirm(`¿Enviar resumen a ${user.username} vía WhatsApp?`)) return;
  try {
    await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/sendPending`, { pendingId: pending._id, targetUserId: user._id });
    toast.success(`Resumen enviado a ${user.username}`);
  } catch (err) {
    toast.error('Error al enviar resumen');
  }
}, []);

  const handleViewIncidence = useCallback((pending: Pending) => {
    if (pending.incidentId) {
      navigate(`/incidents/${pending.incidentId}`);
    }
  }, [navigate]);

  const handleViewAssistance = useCallback(async (pending: Pending) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/assistances`, { headers: { Authorization: `Bearer ${token}` } });
      const assistance = res.data.find((a: Assistance) => a.pendingId === pending._id);
      if (assistance) {
        navigate(`/assistances/${assistance._id}`);
      } else {
        toast.info('No hay asistencia asociada a esta tarea pendiente');
      }
    } catch (err: any) {
      toast.error('Error al buscar asistencia');
    }
  }, [navigate]);

  const getRowContextMenu2 = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const menuItems = [
    {
      label: ' Nuevo Pendiente',
      icon: <FaPlus />,
      onClick: handleNewPending,
      disabled: userRank !== ranks.TOTALACCESS,
    }
  ]
   showMenu(e.clientX, e.clientY, menuItems) 
  },[showMenu, handleNewPending])
  

  const getRowContextMenu = useCallback((row: Pending) => [
    {
      label: ' Nuevo Pendiente',
      icon: <FaPlus />,
      onClick: handleNewPending,
      disabled: userRank !== ranks.TOTALACCESS,
    },
    {
      label: ' Modificar',
      icon: <FaEdit />,
      onClick: () => handleEdit(row),
      disabled: userRank !== ranks.TOTALACCESS,
    },
    {
      label: ' Enviar por whatsapp',
      icon: <FaWhatsapp />,
      onClick: () => handleSendWhatsapp(row),
    },
    {
      label: ' Enviar por whatsapp...',
      icon: <FaWhatsapp />,
      onClick: () => {},
      children: users.filter(u => u._id !== row.userId).map((user) => ({
  label: user.username,
  onClick: () => handleSendWhatsappToUser(row, user),
})),
    },
    {
      label: ' Ver Incidencia',
      icon: <FaEye />,
      onClick: () => handleViewIncidence(row),
      disabled: !row.incidentId,
    },
    {
      label: ' Eliminar',
      icon: <FaTrash />,
      onClick: () => handleDelete(row),
      disabled: userRank !== ranks.TOTALACCESS,
    },
  ], [userRank, users, handleNewPending, handleEdit, handleSendWhatsapp, handleSendWhatsappToUser, handleViewIncidence, handleDelete]);

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
      <h1 className={styles.title}>Tareas Pendientes</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div onContextMenu={(e) => getRowContextMenu2(e)} style={{ height: 'auto', width: '100%' }}>
        <CustomTable
          rowData={pendings}
          columnDefs={[
            {
              field: 'clientId',
              headerName: 'Cliente',
              sortable: true,
              filterable: true,
              valueFormatter: (value) => getClientName(value),
            },
            {
              field: 'userId',
              headerName: 'Usuario',
              sortable: true,
              filterable: true,
              valueFormatter: (value) => getUserName(value),
            },
            {
              field: 'assignedUserId',
              headerName: 'Asignado',
              sortable: true,
              filterable: true,
              valueFormatter: (value) => getUserName(value),
            },
            {
              field: 'date',
              headerName: 'Fecha',
              sortable: true,
              filterable: true,
              valueFormatter: (value) => new Date(value).toLocaleDateString(),
            },
            {
              field: 'status',
              headerName: 'Estado',
              sortable: true,
              filterable: true,
              valueFormatter: (value) => incident_status[value as keyof typeof incident_status] || value,
            },
            { field: 'detail', headerName: 'Detalle', sortable: true, filterable: true },
            { field: 'observation', headerName: 'Observación', sortable: true, filterable: true },
            {
              field: 'sequenceNumber',
              headerName: 'Número',
              sortable: true,
              filterable: true,
              valueFormatter: (value) => value ? value : 'Sin número asignado',
            },
          ]}
          pagination={true}
          defaultPageSize={15}
          searchable={true}
          customizable={true}
          storageKey="pendingTable"
          onRowContextMenu={getRowContextMenu}
        />
      </div>
      <Modal
  isOpen={showAddForm && userRank === ranks.TOTALACCESS}
  onClose={() => setShowAddForm(false)}
  title={editingPending ? 'Editar Tarea Pendiente' : 'Agregar Tarea Pendiente'}
>
  <form onSubmit={handleSubmit} className="modalForm">
    <div className="formGroup">
      <label>Cliente *</label>
      <select name="clientId" value={newPending.clientId || ''} onChange={handleInputChange} required>
        <option value="">Seleccione un cliente</option>
        {clients.map((client) => (
          <option key={client._id} value={client._id}>{client.name}</option>
        ))}
      </select>
    </div>
    <div className="formGroup">
      <label>Fecha</label>
      <input type="date" name="date" value={new Date(newPending.date).toISOString().split('T')[0]} onChange={handleInputChange} required />
    </div>
    <div className="formGroup">
      <label>Estado *</label>
      <select name="status" value={newPending.status || ''} onChange={handleInputChange} required>
        <option value="">Seleccione un estado</option>
        {Object.values(incident_status).map((value) => (
          <option key={value} value={value}>{value}</option>
        ))}
      </select>
    </div>
    <div className="formGroup">
      <label>Detalle *</label>
      <textarea name="detail" value={newPending.detail || ''} onChange={handleInputChange} required />
    </div>
    <div className="formGroup">
      <label>Observación</label>
      <input type="text" name="observation" value={newPending.observation || ''} onChange={handleInputChange} />
    </div>
    <button type="submit">{editingPending ? 'Actualizar' : 'Crear'} Tarea Pendiente</button>
    <button type="button" onClick={() => setShowAddForm(false)}>Cancelar</button>
  </form>
</Modal>
    </div>
  );
};

export default PendingTask;