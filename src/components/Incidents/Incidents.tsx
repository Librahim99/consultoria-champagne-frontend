import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import axios from 'axios';
import { incident_status, incident_types, ranks } from '../../utils/enums';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { Incident, Client, User } from '../../utils/interfaces';
import styles from './Incidents.module.css';
import Modal from 'react-modal';
import Spinner from '../Spinner/Spinner';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const schema = yup.object({
  clientId: yup.string().required('Cliente requerido'),
  executiveId: yup.string().required('Ejecutivo requerido'),
  assignedUserId: yup.string().nullable(),
  type: yup.string().required('Tipo requerido'),
  subject: yup.string().required('Asunto requerido'),
  detail: yup.string().required('Detalle requerido'),
  observation: yup.string().nullable(),
  order: yup.number().required('Orden requerida').min(0),
  estimatedTime: yup.number().min(0),
  status: yup.string().required('Estado requerido'),
});

const Incidents: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { userRank, userId } = useContext(UserContext);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const gridRef = useRef<AgGridReact>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => {
    const token = localStorage.getItem('token');
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
        setError(err.response?.data?.message || 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const onSubmit = async (data: any) => {
    const token = localStorage.getItem('token');
    const incidentToSend = { ...data, userId };
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/incidents`, incidentToSend, { headers: { Authorization: `Bearer ${token}` } });
      setIncidents([...incidents, res.data]);
      setShowForm(false);
      reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear incidente');
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) reset({ clientId: '', executiveId: '', assignedUserId: null, type: '', subject: '', detail: '', observation: '', order: 0, estimatedTime: 0, status: 'Pendiente' });
  };

  const getClientName = (clientId: string | null) => clients.find(c => c._id === clientId)?.name || 'Desconocido';
  const getUserName = (userId: string | null) => users.find(u => u._id === userId)?.username || 'Desconocido';

  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'clientId', headerName: 'Cliente', valueGetter: params => getClientName(params.data?.clientId || null) },
    { field: 'userId', headerName: 'Usuario', valueGetter: params => getUserName(params.data?.userId || null) },
    { field: 'executiveId', headerName: 'Ejecutivo', valueGetter: params => getUserName(params.data?.executiveId || null) },
    { field: 'assignedUserId', headerName: 'Asignado', valueGetter: params => getUserName(params.data?.assignedUserId || null) },
    { field: 'detail', headerName: 'Detalle' },
    { field: 'order', headerName: 'Orden' },
    { field: 'status', headerName: 'Estado' },
    { field: 'creationDate', headerName: 'Fecha de Creación' },
    { field: 'sequenceNumber', headerName: 'Número', valueFormatter: params => params.value ? params.value : 'Sin número asignado' },
  ], [clients, users]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
  }), []);

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

  if (loading) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Incidencias</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === ranks.TOTALACCESS && (
        <button onClick={toggleForm} className={styles.button}>
          {showForm ? 'Cancelar' : 'Agregar Incidencia'}
        </button>
      )}
      <div className={theme === 'light' ? 'ag-theme-alpine' : 'ag-theme-alpine-dark'} style={{ height: 400, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={incidents}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          pagination={true}
          paginationPageSize={10}
          animateRows={true}
          domLayout='autoHeight'
          className={theme === 'light' ? 'ag-theme-alpine' : 'ag-theme-alpine-dark'}
        />
      </div>
      <Modal isOpen={showForm} onRequestClose={toggleForm} className={styles.modal} contentLabel="Formulario Incidencia">
        <h2>Agregar Incidencia</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formGroup}>
            <label>Cliente *</label>
            <select {...register('clientId')}>
              <option value="">Seleccione un cliente</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.name}</option>
              ))}
            </select>
            {errors.clientId && <p className={styles.error}>{errors.clientId.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Ejecutivo *</label>
            <select {...register('executiveId')}>
              <option value="">Seleccione un ejecutivo</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>{user.username}</option>
              ))}
            </select>
            {errors.executiveId && <p className={styles.error}>{errors.executiveId.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Asignado</label>
            <select {...register('assignedUserId')}>
              <option value="">No asignado</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>{user.username}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tipo *</label>
            <select {...register('type')}>
              <option value="">Seleccione un tipo</option>
              {Object.values(incident_types).filter((type) => type !== incident_types.TICKET).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.type && <p className={styles.error}>{errors.type.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Asunto *</label>
            <input {...register('subject')} placeholder="Ingresa el asunto" />
            {errors.subject && <p className={styles.error}>{errors.subject.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Detalle *</label>
            <textarea {...register('detail')} placeholder="Describe el detalle" />
            {errors.detail && <p className={styles.error}>{errors.detail.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Observación</label>
            <input {...register('observation')} placeholder="Observaciones opcionales" />
          </div>
          <div className={styles.formGroup}>
            <label>Orden *</label>
            <input type="number" {...register('order')} placeholder="Orden numérica" />
            {errors.order && <p className={styles.error}>{errors.order.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Tiempo Estimado (horas)</label>
            <input type="number" {...register('estimatedTime')} placeholder="Tiempo en horas" />
          </div>
          <div className={styles.formGroup}>
            <label>Estado *</label>
            <select {...register('status')}>
              <option value="">Seleccione un estado</option>
              {Object.values(incident_status).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            {errors.status && <p className={styles.error}>{errors.status.message}</p>}
          </div>
          <button type="submit" className={styles.button}>Crear Incidencia</button>
          <button type="button" onClick={toggleForm} className={styles.cancelButton}>Cancelar</button>
        </form>
      </Modal>
    </div>
  );
};

export default Incidents;