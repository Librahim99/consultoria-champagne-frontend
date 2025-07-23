import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { incident_status } from '../../utils/enums';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { type Pending, Client, User, DecodedToken } from '../../utils/interfaces';
import styles from './Pending.module.css';

// Función para mapear valores legibles a claves del enum
const mapStatusToKey = (value: string): keyof typeof incident_status | '' => {
  const entry = Object.entries(incident_status).find(([_, val]) => val === value);
  return entry ? entry[0] as keyof typeof incident_status : '';
};

const PendingTask: React.FC = () => {
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [error, setError] = useState<string>('');
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
  const gridRef = useRef<AgGridReact>(null);

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
      setNewPending(prev => ({ ...prev, userId: decoded.id })); // Establecer userId al cargar
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

  const handleEdit = (pending: Pending) => {
    setEditingPending(pending);
    // Mapear el status guardado (clave) a su valor legible para el formulario
    const statusValue = pending.status ? incident_status[pending.status as keyof typeof incident_status] || 'Pendiente' : 'Pendiente';
    setNewPending({ ...pending, userId: loggedInUserId, status: statusValue });
    setShowAddForm(true);
  };

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

    // Validar campos requeridos
    if (!newPending.clientId || !newPending.detail) {
      setError('Faltan campos requeridos: Cliente o Detalle');
      return;
    }

    // Mapear el valor legible del status a su clave correspondiente
    const statusKey = mapStatusToKey(newPending.status);
    if (!statusKey) {
      setError('Estado no válido');
      return;
    }

    // Log de datos enviados para depuración
    console.log('Datos enviados:', JSON.stringify({ ...newPending, userId: loggedInUserId, status: statusKey }, null, 2));

    try {
      if (editingPending) {
        const res = await axios.put(`${process.env.REACT_APP_API_URL}/api/pending/${editingPending._id}`, { ...newPending, userId: loggedInUserId, status: statusKey }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendings(pendings.map(p => (p._id === editingPending._id ? res.data : p)));
        setEditingPending(null);
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/pending`, { ...newPending, userId: loggedInUserId, status: statusKey }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendings([...pendings, res.data]);
      }
      setNewPending({
        _id: '',
        clientId: '',
        date: new Date().toISOString(),
        status: 'Pendiente', // Valor legible por defecto
        detail: '',
        observation: null,
        incidentId: null,
        userId: loggedInUserId,
        assignedUserId: null,
        completionDate: null,
      });
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar pendiente');
      console.error('Error detallado:', err.response?.data);
    }
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    setEditingPending(null);
    setNewPending({
      _id: '',
      clientId: '',
      date: new Date().toISOString(),
      status: 'Pendiente', // Valor legible por defecto
      detail: '',
      observation: null,
      incidentId: null,
      userId: loggedInUserId,
      assignedUserId: null,
      completionDate: null,
    });
  };

  const getClientName = (clientId: string | null) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : 'Desconocido';
  };

  const getUserName = (userId: string | null) => {
    const user = users.find(u => u._id === userId);
    return user ? user.username : 'Desconocido';
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      field: 'clientId', 
      headerName: 'Cliente', 
      sortable: true, 
      resizable: true, 
      valueGetter: (params) => getClientName(params.data?.clientId || null) 
    },
    { 
      field: 'userId', 
      headerName: 'Usuario', 
      sortable: true, 
      resizable: true, 
      valueGetter: (params) => getUserName(params.data?.userId || null) 
    },
    { 
      field: 'assignedUserId', 
      headerName: 'Asignado', 
      sortable: true, 
      resizable: true, 
      valueGetter: (params) => getUserName(params.data?.assignedUserId || null) 
    },
    { field: 'date', headerName: 'Fecha', sortable: true, resizable: true, valueFormatter: params => new Date(params.value).toLocaleDateString() },
    { field: 'status', headerName: 'Estado', sortable: true, resizable: true, valueFormatter: (params) => incident_status[params.value as keyof typeof incident_status] || params.value },
    { field: 'detail', headerName: 'Detalle', sortable: true, resizable: true },
    { field: 'observation', headerName: 'Observación', sortable: true, resizable: true },
    { 
      field: 'sequenceNumber', 
      headerName: 'Número', 
      sortable: true, 
      resizable: true, 
      valueFormatter: (params) => params.value ? params.value : 'Sin número asignado' 
    },
  ], [clients, users]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    const savedColumnOrder = localStorage.getItem('pendingTaskColumnOrder');
    if (savedColumnOrder) {
      const columnState: ColumnState[] = JSON.parse(savedColumnOrder);
      params.api.applyColumnState({ state: columnState });
    }
    gridRef.current!.api.sizeColumnsToFit();
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem('pendingTaskColumnOrder', JSON.stringify(columnState));
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Tareas Pendientes</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === 'Acceso Total' && (
        <button onClick={toggleAddForm} className={styles.button}>
          {showAddForm ? 'Cancelar' : 'Agregar Tarea Pendiente'}
        </button>
      )}
      <div className={styles.gridWrapper}>
        <AgGridReact
          ref={gridRef}
          rowData={pendings}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          animateRows={true}
          domLayout='autoHeight'
          className={styles.agGrid}
        />
      </div>
      {(showAddForm && userRank === 'Acceso Total') && (
        <div className={styles.formContainer}>
          <h2>Agregar Tarea Pendiente</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Cliente *</label>
              <select name="clientId" value={newPending.clientId || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Fecha</label>
              <input type="date" name="date" value={new Date(newPending.date).toISOString().split('T')[0]} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Estado *</label>
              <select name="status" value={newPending.status || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un estado</option>
                {Object.values(incident_status).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Detalle *</label>
              <textarea name="detail" value={newPending.detail || ''} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Observación</label>
              <input type="text" name="observation" value={newPending.observation || ''} onChange={handleInputChange} />
            </div>
            <button type="submit" className={styles.button}>Crear Tarea Pendiente</button>
            <button
              type="button"
              onClick={toggleAddForm}
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

export default PendingTask;