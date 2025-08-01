import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import axios, { AxiosResponse } from 'axios';
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
import CustomTable from '../CustomTable/CustomTable';

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

  if (loading) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clientes</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div style={{ height: 'auto', width: '100%' }}>
  <CustomTable
    rowData={clients}
    columnDefs={[
      { field: 'common', headerName: 'Común', sortable: true, filterable: true },
      { field: 'name', headerName: 'Nombre', sortable: true, filterable: true },
      { field: 'lastUpdate', headerName: 'Última Actualización', sortable: true, filterable: true },
      {
        field: 'vip',
        headerName: 'VIP',
        sortable: true,
        filterable: true,
        valueFormatter: (value) => value ? 'Sí' : 'No',
      },
      {
        field: 'active',
        headerName: 'Activo',
        sortable: true,
        filterable: true,
        valueFormatter: (value) => value ? 'Sí' : 'No',
      },
      {
        field: 'actions',
        headerName: 'Acciones',
        cellRenderer: (data) => userRank === 'Acceso Total' && <button onClick={() => handleEdit(data)} data-tip="Editar cliente">Editar</button>,
      },
    ]}
    pagination={true}
    defaultPageSize={10}
    searchable={true}
    customizable={true}
  storageKey="clientTable"
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