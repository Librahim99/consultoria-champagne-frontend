import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import axios, { AxiosResponse } from 'axios';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { Client } from '../../utils/interfaces';
import styles from './Clients.module.css';
import Modal from 'react-modal';
import Spinner from '../Spinner/Spinner'; // Asume existe
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import ReactTooltip from 'react-tooltip';
import { ranks } from '../../utils/enums';

const schema = yup.object({
  name: yup.string().required('Nombre requerido').min(3, 'Mínimo 3 caracteres'),
  common: yup.string().required('Común requerido').matches(/^[0-9]{4}$/, 'Debe ser 4 dígitos numéricos'),
  vip: yup.boolean(),
  active: yup.boolean(),
});

const Clients: React.FC = () => {
  const { userRank } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string>('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<AgGridReact>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: yupResolver(schema) });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchClients = async () => {
      try {
        const res = await axios.get<Client[]>(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
        setClients(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar clientes');
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    reset({ name: client.name, common: client.common, vip: client.vip, active: client.active });
    setShowForm(true);
  };

  const onSubmit = async (data: any) => {
    const token = localStorage.getItem('token');
    try {
      let res: AxiosResponse<any, any>;
      if (editingClient) {
        res = await axios.put(`${process.env.REACT_APP_API_URL}/api/clients/${editingClient._id}`, data, { headers: { Authorization: `Bearer ${token}` } });
        setClients(clients.map(c => c._id === editingClient._id ? res.data : c));
      } else {
        res = await axios.post(`${process.env.REACT_APP_API_URL}/api/clients`, data, { headers: { Authorization: `Bearer ${token}` } });
        setClients([...clients, res.data]);
      }
      setShowForm(false);
      setEditingClient(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar cliente');
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) reset({ name: '', common: '', vip: false, active: true });
    setEditingClient(null);
  };

  const columnDefs = useMemo<ColDef[]>(() => [
    { field: 'common', headerName: 'Común' },
    { field: 'name', headerName: 'Nombre' },
    { field: 'lastUpdate', headerName: 'Última Actualización' },
    { field: 'vip', headerName: 'VIP', valueFormatter: p => p.value ? 'Sí' : 'No' },
    { field: 'active', headerName: 'Activo', valueFormatter: p => p.value ? 'Sí' : 'No' },
    { headerName: 'Acciones', cellRenderer: (params: { data: Client; }) => userRank === ranks.TOTALACCESS && <button onClick={() => handleEdit(params.data)} data-tip="Editar cliente">Editar</button> },
  ], [userRank]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // ... original
  }, []);

  const onColumnMoved = useCallback(() => {
    // ... original
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clientes</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === ranks.TOTALACCESS && (
        <button onClick={toggleForm} className={styles.button} data-tip="Agregar o editar cliente">
          {showForm ? 'Cancelar' : 'Agregar Cliente'}
        </button>
      )}
      <div className={theme === 'light' ? 'ag-theme-alpine' : 'ag-theme-alpine-dark'}>
        <AgGridReact
          ref={gridRef}
          rowData={clients}
          columnDefs={columnDefs}
          defaultColDef={{ sortable: true, resizable: true, filter: true }}
          pagination={true}
          paginationPageSize={10}
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          animateRows={true}
          domLayout='autoHeight'
          className={theme === 'light' ? 'ag-theme-alpine' : 'ag-theme-alpine-dark'}
        />
      </div>
      <Modal isOpen={showForm} onRequestClose={toggleForm} className={styles.modal} contentLabel="Formulario Cliente">
        <h2 className={styles.modalTitle}>{editingClient ? 'Editar Cliente' : 'Agregar Cliente'}</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formGroup}>
            <label>Nombre *</label>
            <input {...register('name')} placeholder="Ingresa el nombre del cliente" />
            {errors.name && <p className={styles.error}>{errors.name.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>Común (4 dígitos) *</label>
            <input {...register('common')} placeholder="Ej: 1234" />
            {errors.common && <p className={styles.error}>{errors.common.message}</p>}
          </div>
          <div className={styles.formGroup}>
            <label>VIP</label>
            <input type="checkbox" {...register('vip')} />
          </div>
          <div className={styles.formGroup}>
            <label>Activo</label>
            <input type="checkbox" {...register('active')} />
          </div>
          <div className={styles.buttonsContainer}>
          <button type="submit" className={styles.button}>Guardar</button>
          <button type="button" onClick={toggleForm} className={styles.cancelButton}>Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;