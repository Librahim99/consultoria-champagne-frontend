import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { type Assistance, Client, User, DecodedToken } from '../../utils/interfaces';
import styles from './Assistance.module.css'; // Corregido a Assistances.module.css

const Assistances: React.FC = () => {
  const [assistances, setAssistances] = useState<Assistance[]>([]);
  const [error, setError] = useState<string>('');
  const [editingAssistance, setEditingAssistance] = useState<Assistance | null>(null);
  const [newAssistance, setNewAssistance] = useState<Assistance>({
    _id: '',
    clientId: '',
    userId: '',
    date: new Date().toISOString(),
    detail: '',
    contact: '',
    timeSpent: 0,
    incidentId: null,
    pendingId: null,
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
      setNewAssistance(prev => ({ ...prev, userId: decoded.id })); // Establecer userId al cargar
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      setError('Token inválido o corrupto');
    }

    const fetchData = async () => {
      try {
        const [clientsRes, usersRes, assistancesRes] = await Promise.all([
          axios.get<Client[]>('http://localhost:5000/api/clients', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<User[]>('http://localhost:5000/api/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<Assistance[]>('http://localhost:5000/api/assistances', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
        setAssistances(assistancesRes.data);
      } catch (err: any) {
        console.error('Fetch Error Details:', err.response?.data || err.message, err.response?.status);
        setError(err.response?.data?.message || 'Error al cargar datos');
      }
    };
    if (userRank && !error) fetchData();
  }, [userRank, error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAssistance(prev => ({
      ...prev,
      [name]: value === '' ? null : value,
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
    if (!newAssistance.clientId || !newAssistance.detail || !newAssistance.contact || !newAssistance.timeSpent) {
      setError('Faltan campos requeridos: Cliente, Detalle, Contacto o Tiempo Gastado');
      return;
    }

    const assistanceToSend = { ...newAssistance, userId: loggedInUserId }; // No incluimos sequenceNumber

    try {
      if (editingAssistance) {
        const res = await axios.put(`http://localhost:5000/api/assistances/${editingAssistance._id}`, assistanceToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssistances(assistances.map(a => (a._id === editingAssistance._id ? res.data : a)));
        setEditingAssistance(null);
      } else {
        const res = await axios.post('http://localhost:5000/api/assistances', assistanceToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssistances([...assistances, res.data]);
      }
      setNewAssistance({
        _id: '',
        clientId: '',
        userId: loggedInUserId,
        date: new Date().toISOString(),
        detail: '',
        contact: '',
        timeSpent: 0,
        incidentId: null,
        pendingId: null,
      });
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar asistencia');
      console.error('Error detallado:', err.response?.data);
    }
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setNewAssistance({
        _id: '',
        clientId: '',
        userId: loggedInUserId,
        date: new Date().toISOString(),
        detail: '',
        contact: '',
        timeSpent: 0,
        incidentId: null,
        pendingId: null,
      });
    }
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
    { field: 'date', headerName: 'Fecha', sortable: true, resizable: true, valueFormatter: params => new Date(params.value).toLocaleDateString() },
    { field: 'detail', headerName: 'Detalle', sortable: true, resizable: true },
    { field: 'contact', headerName: 'Contacto', sortable: true, resizable: true },
    { field: 'timeSpent', headerName: 'Tiempo Gastado (min)', sortable: true, resizable: true },
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
    const savedColumnOrder = localStorage.getItem('assistancesColumnOrder');
    if (savedColumnOrder) {
      const columnState: ColumnState[] = JSON.parse(savedColumnOrder);
      params.api.applyColumnState({ state: columnState });
    }
    gridRef.current!.api.sizeColumnsToFit();
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem('assistancesColumnOrder', JSON.stringify(columnState));
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Asistencias</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === 'Acceso Total' && (
        <button onClick={toggleAddForm} className={styles.button}>
          {showAddForm ? 'Cancelar' : 'Agregar Asistencia'}
        </button>
      )}
      <div className={styles.gridWrapper}>
        <AgGridReact
          ref={gridRef}
          rowData={assistances}
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
          <h2>Agregar Asistencia</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Cliente *</label>
              <select name="clientId" value={newAssistance.clientId || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Fecha</label>
              <input type="date" name="date" value={new Date(newAssistance.date).toISOString().split('T')[0]} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Detalle *</label>
              <textarea name="detail" value={newAssistance.detail || ''} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Contacto *</label>
              <input type="text" name="contact" value={newAssistance.contact || ''} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Tiempo Gastado (min) *</label>
              <input type="number" name="timeSpent" value={newAssistance.timeSpent} onChange={handleInputChange} required />
            </div>
            <button type="submit" className={styles.button}>Crear Asistencia</button>
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

export default Assistances;