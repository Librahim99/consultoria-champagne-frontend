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
  // Nuevos estados para el modal de fecha personalizada
const [showDateModal, setShowDateModal] = useState(false);
const [selectedClient, setSelectedClient] = useState<Client | null>(null);
const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]); // Fecha actual por default
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

  const handleEdit = useCallback((client: Client) => {
  setEditingClient(client);
  reset({ name: client.name, common: client.common, vip: client.vip, active: client.active });
  setShowForm(true);
}, [reset]); // Dependencias: reset (de useForm)

 const handleNewClient = useCallback(() => {
  setEditingClient(null);
  reset({ name: null, common: null, vip: false, active: true });
  setShowForm(true);
}, [reset]);

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

// Nueva función para actualizar lastUpdate
const handleUpdateLicense = async (client: Client, newDate: string) => {
  if (userRank === ranks.GUEST) {
    toast.error('No tienes permisos para actualizar');
    return;
  }
  const token = localStorage.getItem('token');
  try {
    // Actualización optimista en el state local
    // const updatedClient = { ...client, lastUpdate: newDate }; // newDate ya es YYYY-MM-DD
    // setClients(clients.map(c => c._id === client._id ? updatedClient : c));

    const res = await axios.patch(`${process.env.REACT_APP_API_URL}/api/clients/${client._id}/update-license`, 
      { lastUpdate: newDate }, // Enviar como string YYYY-MM-DD
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setClients(clients.map(c => c._id === client._id ? res.data : c));
    toast.success(`Fecha de licencia actualizada para ${client.name} al ${newDate}`);
  } catch (err: any) {
    setClients(clients.map(c => c._id === client._id ? client : c));
    toast.error(err.response?.data?.message || 'Error al actualizar fecha');
  }
};

const openDateModal = useCallback((client: Client) => {
  setSelectedClient(client);
  setCustomDate(new Date().toISOString().split('T')[0]); // Reset a hoy
  setShowDateModal(true);
}, []);

const handleCustomDateSubmit = useCallback(() => {
  if (selectedClient && customDate) {
    handleUpdateLicense(selectedClient, customDate); // Enviar customDate directamente (YYYY-MM-DD)
    setShowDateModal(false);
  }
}, [selectedClient, customDate, handleUpdateLicense]);

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
  label: ' Actualizar Licencia',
  icon: <FaClock />,
  disabled: userRank === ranks.GUEST,
  children: [
    {
      label: 'Fecha de hoy',
      onClick: () => handleUpdateLicense(row, new Date().toISOString().split('T')[0]),
    },
    {
      label: 'Fecha de ayer',
      onClick: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        handleUpdateLicense(row, yesterday.toISOString().split('T')[0]);
      },
    },
    {
      label: 'Otra fecha',
      onClick: () => openDateModal(row),
    },
  ]
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
        label: ' Eliminar',
        icon: <FaTrash />,
        onClick: () => handleDelete(row),
        disabled: userRank !== ranks.TOTALACCESS,
      },
    ], [userRank, handleUpdateLicense, openDateModal, handleDelete, handleEdit, handleNewClient]);
  

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
      { field: 'licenseDays', headerName: 'Dias de Licencia', sortable: false, filterable: false, cellRenderer: ( data ) => {
    if (!data.lastUpdate) return 'N/A';

    const lastUpdate = new Date(data.lastUpdate);
    const expirationDate = new Date(lastUpdate);
    expirationDate.setDate(lastUpdate.getDate() + 60);
    const today = new Date();
    const daysLeft = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return <span className={styles.redText}>Vencida</span>;
    }
    if (daysLeft <= 15) {
      return <span className={styles.yellowText}>{daysLeft} días</span>;
    }
    return <span className={styles.greenText}>{daysLeft} días</span>;
  } }
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
      {/* Nuevo Modal para fecha personalizada */}
<Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} title={selectedClient?.name}>
  <div className="modalForm">
    <div className="formGroup">
      <label>Fecha *</label>
      <input 
        type="date" 
        value={customDate} 
        onChange={(e) => setCustomDate(e.target.value)} 
        max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
      />
    </div>
    <button type="button" onClick={handleCustomDateSubmit} disabled={!customDate}>Actualizar</button>
    <button type="button" onClick={() => setShowDateModal(false)}>Cancelar</button>
  </div>
</Modal>
    </div>
  );
};

export default Clients;