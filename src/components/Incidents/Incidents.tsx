import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { incident_status, incident_types } from '../../utils/enums';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { Incident, Client, User, DecodedToken } from '../../utils/interfaces';
import styles from './Incidents.module.css';

const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string>('');
  const [newIncident, setNewIncident] = useState<Incident>({
    _id: '',
    clientId: '',
    userId: '',
    executiveId: '',
    assignedUserId: null,
    type: '',
    subject: '',
    detail: '',
    observation: '',
    attachments: [],
    order: 0,
    estimatedTime: 0,
    actualTime: 0,
    status: 'Pendiente',
    creationDate: new Date().toISOString(),
    completionDate: '',
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
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        setError('Token ha expirado');
      }
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      setError('Token inválido o corrupto');
    }

    const fetchData = async () => {
      try {
        const [clientsRes, usersRes, incidentsRes] = await Promise.all([
          axios.get<Client[]>(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<User[]>(`${process.env.REACT_APP_API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get<Incident[]>(`${process.env.REACT_APP_API_URL}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
        setIncidents(incidentsRes.data);
      } catch (err: any) {
        console.error('Fetch Error Details:', err.response?.data || err.message, err.response?.status);
        setError(err.response?.data?.message || 'Error al cargar datos');
      }
    };
    if (userRank && !error) fetchData();
  }, [userRank, error]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewIncident(prev => ({
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
    const incidentToSend: Incident = {
      ...newIncident,
      userId: loggedInUserId,
      assignedUserId: newIncident.assignedUserId || null,
    };
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/incidents`, incidentToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIncidents([...incidents, res.data]);
      setNewIncident({
        _id: '',
        clientId: '',
        userId: loggedInUserId,
        executiveId: '',
        assignedUserId: null,
        type: '',
        subject: '',
        detail: '',
        observation: '',
        attachments: [],
        order: 0,
        estimatedTime: 0,
        actualTime: 0,
        status: 'Pendiente',
        creationDate: new Date().toISOString(),
        completionDate: '',
      });
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear incidente');
    }
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setNewIncident({
        _id: '',
        clientId: '',
        userId: loggedInUserId,
        executiveId: '',
        assignedUserId: null,
        type: '',
        subject: '',
        detail: '',
        observation: '',
        attachments: [],
        order: 0,
        estimatedTime: 0,
        actualTime: 0,
        status: 'Pendiente',
        creationDate: new Date().toISOString(),
        completionDate: '',
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
    { 
      field: 'executiveId', 
      headerName: 'Ejecutivo', 
      sortable: true, 
      resizable: true, 
      valueGetter: (params) => getUserName(params.data?.executiveId || null) 
    },
    { 
      field: 'assignedUserId', 
      headerName: 'Asignado', 
      sortable: true, 
      resizable: true, 
      valueGetter: (params) => getUserName(params.data?.assignedUserId || null) 
    },
    { field: 'detail', headerName: 'Detalle', sortable: true, resizable: true },
    { field: 'order', headerName: 'Orden', sortable: true, resizable: true },
    { field: 'status', headerName: 'Estado', sortable: true, resizable: true },
    { field: 'creationDate', headerName: 'Fecha de Creación', sortable: true, resizable: true },
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
    const savedColumnOrder = localStorage.getItem('incidentsColumnOrder');
    if (savedColumnOrder) {
      const columnState: ColumnState[] = JSON.parse(savedColumnOrder);
      params.api.applyColumnState({ state: columnState });
    }
    gridRef.current!.api.sizeColumnsToFit();
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem('incidentsColumnOrder', JSON.stringify(columnState));
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Incidencias</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === 'Acceso Total' && (
        <button onClick={toggleAddForm} className={styles.button}>
          {showAddForm ? 'Cancelar' : 'Agregar Incidencia'}
        </button>
      )}
      <div className={styles.gridWrapper}>
        <AgGridReact
          ref={gridRef}
          rowData={incidents}
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
          <h2>Agregar Incidencia</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Cliente *</label>
              <select name="clientId" value={newIncident.clientId || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Ejecutivo *</label>
              <select name="executiveId" value={newIncident.executiveId || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un ejecutivo</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>{user.username}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Asignado</label>
              <select name="assignedUserId" value={newIncident.assignedUserId || ''} onChange={handleInputChange}>
                <option value="">No asignado</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>{user.username}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Tipo *</label>
              <select name="type" value={newIncident.type || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un tipo</option>
                {Object.values(incident_types)
                  .filter((type) => type !== incident_types.TICKET)
                  .map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Asunto *</label>
              <input type="text" name="subject" value={newIncident.subject || ''} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Detalle *</label>
              <textarea name="detail" value={newIncident.detail || ''} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Observación</label>
              <input type="text" name="observation" value={newIncident.observation || ''} onChange={handleInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Orden *</label>
              <input type="number" name="order" value={newIncident.order} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Tiempo Estimado (horas)</label>
              <input type="number" name="estimatedTime" value={newIncident.estimatedTime} onChange={handleInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Estado *</label>
              <select name="status" value={newIncident.status || ''} onChange={handleInputChange} required>
                <option value="">Seleccione un estado</option>
                {Object.values(incident_status).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <button type="submit" className={styles.button}>Crear Incidencia</button>
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

export default Incidents;