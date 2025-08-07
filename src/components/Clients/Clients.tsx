import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import axios, { AxiosResponse } from 'axios';
import { Client } from '../../utils/interfaces';
import styles from './Clients.module.css';
import Modal from '../Modal/Modal';
import Spinner from '../Spinner/Spinner'; // Asume existe
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import ReactTooltip from 'react-tooltip';
import CustomTable from '../CustomTable/CustomTable';
import { ranks } from '../../utils/enums';
import { useContextMenu } from '../../contexts/UseContextMenu';
import { FaClock, FaEdit, FaExclamationTriangle, FaHeadset, FaPlus, FaTasks, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

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
    const { showMenu } = useContextMenu();
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
        const clientes = res.data.sort((a: Client, b: Client) => parseInt(a.common) - parseInt(b.common))
        setClients(clientes);
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

  const handleNewClient = () => {
    setEditingClient(null)
    reset({name: null, common: null, vip: false, active: true})
    setShowForm(true);
  }

  const handleDelete =useCallback(async (client: Client) => {
    if (userRank === ranks.GUEST) {
      setError('No tienes permisos para eliminar');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/clients/${client._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(clients.filter(p => p._id !== client._id));
      toast.success(`Cliente ${client.name} Eliminado.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar cliente');
    }
  }, [clients, userRank])

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


  const getRowContextMenu = useCallback((row: Client) => [
      {
        label: ' Nuevo Cliente',
        icon: <FaPlus />,
        onClick: handleNewClient,
        disabled: userRank === ranks.GUEST,
      },
      {
        label: ' Modificar',
        icon: <FaEdit />,
        onClick: () => handleEdit(row),
        disabled: userRank === ranks.GUEST,
      },
      {
        label: ' Ver Pendientes',
        icon: <FaTasks />,
        onClick: () => {},
        disabled: true
      },
      {
        label: ' Ver Incidencias',
        icon: <FaExclamationTriangle />,
        onClick: () => {},
        disabled: true
      },
      {
        label: ' Ver Asistencias',
        icon: <FaHeadset />,
        onClick: () => {},
        disabled: true
      },
      {
        label: ' Actualizar fecha de licencia',
        icon: <FaClock />,
        onClick: () => {},
        disabled: true
      },
      {
        label: ' Eliminar',
        icon: <FaTrash />,
        onClick: () => handleDelete(row),
        disabled: userRank !== ranks.TOTALACCESS,
      },
    ], [userRank, clients]);
  

  const getContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const menuItems = [
      {
        label: ' Nuevo Cliente',
        icon: <FaPlus />,
        onClick: handleNewClient,
        disabled: userRank === ranks.GUEST,
      }
    ]
     showMenu(e.clientX, e.clientY, menuItems) 
    },[showMenu, handleEdit])


  if (loading) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clientes</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div onContextMenu={(e) => getContextMenu(e)} style={{ height: 'auto', width: '100%' }}>
  <CustomTable
    rowData={clients}
    columnDefs={[
      { field: 'common', headerName: 'Común', sortable: true, filterable: true },
      { field: 'name', headerName: 'Nombre', sortable: true, filterable: true, cellRenderer: (data) => data.vip ? `${data.name || ''} ★` : data.name || '', },
      { field: 'lastUpdate', headerName: 'Última Actualización', sortable: true, filterable: true, valueFormatter: (value) => value ? new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '' },
      { field: 'licenseDays', headerName: 'Dias de licenciaaaaaaaaa', sortable: true, filterable: true, cellRenderer: (data) => (data.lastUpdate) }
    ]}
    pagination={true}
    defaultPageSize={15}
    searchable={true}
    customizable={true}
  storageKey="clientTable"
  onRowContextMenu={getRowContextMenu}
  />
</div>
      <Modal isOpen={showForm} onClose={toggleForm} title={editingClient ? 'Editar Cliente' : 'Agregar Cliente'}>
        <form onSubmit={handleSubmit(onSubmit)} className="modalForm">
          <div className="formGroup">
            <label>Nombre *</label>
            <input {...register('name')} placeholder="Ingresa el nombre del cliente" />
            {errors.name && <p className={styles.error}>{errors.name.message}</p>}
          </div>
          <div className="formGroup">
            <label>Común (4 dígitos) *</label>
            <input {...register('common')} placeholder="Ej: 1234" />
            {errors.common && <p className={styles.error}>{errors.common.message}</p>}
          </div>
          <div className="formGroup">
            <label>VIP</label>
            <input type="checkbox" {...register('vip')} />
          </div>
          <div className="formGroup">
            <label>Activo</label>
            <input type="checkbox" {...register('active')} />
          </div>
          <button type="submit" >Guardar</button>
          <button type="button" onClick={toggleForm}>Cancelar</button>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;