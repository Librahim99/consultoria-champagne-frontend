
import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import axios, { AxiosResponse } from 'axios';
import { AccessInterface, Client } from '../../utils/interfaces';
import styles from './Clients.module.css';
import Modal from '../Modal/Modal';
import Spinner from '../Spinner/Spinner';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import CustomTable from '../CustomTable/CustomTable';
import { ranks } from '../../utils/enums';
import { useContextMenu } from '../../contexts/UseContextMenu';
import { FaClock, FaEdit, FaExclamationTriangle, FaHeadset, FaLaptopHouse, FaPlus, FaTasks, FaTrash, FaKey, FaCopy, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { toast } from 'react-toastify';
import moment from 'moment-timezone';

// Esquema para validar el formulario de cliente
const schema = yup.object({
  name: yup.string().required('Nombre requerido').min(3, 'Mínimo 3 caracteres'),
  common: yup.string().required('Común requerido').matches(/^[0-9]{4}$/, 'Debe ser 4 dígitos numéricos'),
  vip: yup.boolean(),
  active: yup.boolean(),
});

// Esquema para validar el formulario de accesos
const accessSchema = yup.object().shape({
  access: yup.array().of(
    yup.object().shape({
      name: yup.string().required('Nombre del acceso requerido').typeError('Nombre debe ser un texto'),
      ID: yup.string().required('ID del acceso requerido').typeError('ID debe ser un texto'),
      password: yup.string().required('Contraseña del acceso requerida').typeError('Contraseña debe ser un texto'),
    }).required('El acceso no puede ser nulo')
  ).required('El array de accesos no puede ser nulo'),
}).required() as yup.ObjectSchema<AccessFormData>;

// Tipo para los datos del formulario de accesos
interface AccessFormData {
  access: AccessInterface[];
}

const Clients: React.FC = () => {
  const { userRank } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const [clients, setClients] = useState<Client[]>([]);
  const { showMenu } = useContextMenu();
  const [error, setError] = useState<string>('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [customDate, setCustomDate] = useState<string>(moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [expandedAccess, setExpandedAccess] = useState<{ [key: string]: boolean }>({});

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(schema),
  });
  const { register: registerAccess, handleSubmit: handleAccessSubmit, control, formState: { errors: accessErrors }, reset: resetAccess } = useForm<AccessFormData>({
    resolver: yupResolver<AccessFormData, any, AccessFormData>(accessSchema),
    defaultValues: { access: [] },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'access',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchClients = async () => {
      try {
        const res = await axios.get<Client[]>(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } });
        const clientes = res.data.sort((a: Client, b: Client) => parseInt(a.common) - parseInt(b.common));
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
  }, [reset]);

  const handleNewClient = useCallback(() => {
    setEditingClient(null);
    reset({ name: '', common: '', vip: false, active: true });
    setShowForm(true);
  }, [reset]);

  const handleDelete = useCallback(async (client: Client) => {
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
  }, [clients, userRank]);

  const handleUpdateLicense = async (client: Client, newDate: string) => {
    if (userRank === ranks.GUEST) {
      toast.error('No tienes permisos para actualizar');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      if (!moment(newDate, 'YYYY-MM-DD', true).isValid()) {
        throw new Error('Fecha inválida');
      }
      const adjustedDate = moment.tz(newDate, 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires').startOf('day').toISOString();
      const updatedClient = { ...client, lastUpdate: adjustedDate };
      setClients(clients.map(c => c._id === client._id ? updatedClient : c));

      const res = await axios.patch(`${process.env.REACT_APP_API_URL}/api/clients/${client._id}/update-license`, 
        { lastUpdate: newDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClients(clients.map(c => c._id === client._id ? res.data : c));
      toast.success(`Fecha de licencia actualizada para ${client.name} al ${moment.tz(newDate, 'America/Argentina/Buenos_Aires').format('DD/MM/YYYY')}`);
    } catch (err: any) {
      setClients(clients.map(c => c._id === client._id ? client : c));
      toast.error(err.response?.data?.message || 'Error al actualizar fecha');
      console.error('Error en PATCH /update-license:', err.response?.data || err);
    }
  };

  const openDateModal = useCallback((client: Client) => {
    setSelectedClient(client);
    setCustomDate(moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD'));
    setShowDateModal(true);
  }, []);

  const handleCustomDateSubmit = useCallback(() => {
    if (selectedClient && customDate) {
      handleUpdateLicense(selectedClient, customDate);
      setShowDateModal(false);
    }
  }, [selectedClient, customDate, handleUpdateLicense]);

  const openAccessModal = useCallback((client: Client) => {
    setSelectedClient(client);
    resetAccess({ access: client.access || [] });
    setExpandedAccess({}); // Minimizar todos los accesos por defecto
    setShowAccessModal(true);
  }, [resetAccess]);

 const handleAccessSubmitForm: SubmitHandler<AccessFormData> = async (data) => {
    if (userRank === ranks.GUEST) {
      toast.error('No tienes permisos para actualizar accesos');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await axios.patch(`${process.env.REACT_APP_API_URL}/api/clients/${selectedClient?._id}/update-access`, 
        { access: data.access },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClients(clients.map(c => c._id === selectedClient?._id ? res.data : c));
      toast.success(`Accesos actualizados para ${selectedClient?.name}`);
      setShowAccessModal(false);
      setSelectedClient(null);
      setExpandedAccess({});
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar accesos');
    }
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

  const handleAccess = useCallback((access: AccessInterface) => {
    if (access.password) navigator.clipboard.writeText(`${access.password}`);
    if (access.ID) {
      window.open(`anydesk:${access.ID}`);
    }
  }, []);

  const toggleAccessExpansion = useCallback((index: string) => {
    setExpandedAccess(prev => ({
      // ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const copyToClipboard = useCallback((text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copiado al portapapeles`);
  }, []);

  const getRowContextMenu = useCallback((row: Client) => [
    {
      label: ' Nuevo Cliente',
      icon: <FaPlus />,
      onClick: handleNewClient,
      disabled: userRank === ranks.GUEST,
    },
    {
      label: ' Actualizar fecha de licencia',
      icon: <FaClock />,
      disabled: userRank === ranks.GUEST,
      children: [
        {
          label: 'Hoy',
          onClick: () => {
            const today = moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD');
            handleUpdateLicense(row, today);
          },
        },
        {
          label: 'Ayer',
          onClick: () => {
            const yesterday = moment.tz('America/Argentina/Buenos_Aires').subtract(1, 'days').format('YYYY-MM-DD');
            handleUpdateLicense(row, yesterday);
          },
        },
        {
          label: 'Otra',
          onClick: () => openDateModal(row),
        },
      ],
    },
    {
      label: ' Accesos',
      icon: <FaLaptopHouse />,
      onClick: () => {},
      children: row.access?.map(a => ({
        label: ` ${a.name}`,
        icon: <FaLaptopHouse />,
        onClick: () => handleAccess(a),
      })),
      disabled: row.access?.length ? false : true,
      hide: row.access?.length ? false : true
    },
    {
      label: ' Modificar Accesos',
      icon: <FaKey />,
      onClick: () => openAccessModal(row),
      disabled: userRank === ranks.GUEST,
    },
    {
      label: ' Ver Pendientes',
      icon: <FaTasks />,
      onClick: () => {},
      disabled: true,
    },
    {
      label: ' Ver Incidencias',
      icon: <FaExclamationTriangle />,
      onClick: () => {},
      disabled: true,
    },
    {
      label: ' Ver Asistencias',
      icon: <FaHeadset />,
      onClick: () => {},
      disabled: true,
    },
    {
      label: ' Modificar',
      icon: <FaEdit />,
      onClick: () => handleEdit(row),
      disabled: userRank === ranks.GUEST,
    },
    {
      label: ' Eliminar',
      icon: <FaTrash />,
      onClick: () => handleDelete(row),
      disabled: userRank !== ranks.TOTALACCESS,
    },
  ], [userRank, handleUpdateLicense, openDateModal, handleDelete, handleEdit, handleNewClient, handleAccess, openAccessModal]);

  const getContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const menuItems = [
      {
        label: ' Nuevo Cliente',
        icon: <FaPlus />,
        onClick: handleNewClient,
        disabled: userRank === ranks.GUEST,
      },
    ];
    showMenu(e.clientX, e.clientY, menuItems);
  }, [showMenu, handleNewClient]);

  if (loading) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}> ⭐🧑‍💼 Clientes 👩🏻‍💼⭐ </h1>
      {error && <p className={styles.error}>{error}</p>}
      <div onContextMenu={(e) => getContextMenu(e)} style={{ height: 'auto', width: '100%' }}>
        <CustomTable
          rowData={clients}
          columnDefs={[
            { field: 'common', headerName: 'Común', sortable: true, filterable: true },
            { field: 'name', headerName: 'Nombre', sortable: true, filterable: true, cellRenderer: (data) => data.vip ? `${data.name || ''} ★` : data.name || '' },
            { field: 'lastUpdate', headerName: 'Última Actualización', sortable: true, filterable: true, valueFormatter: (value) => value 
              ? moment.tz(value, 'America/Argentina/Buenos_Aires').format('DD/MM/YYYY') 
              : '' },
            { field: 'licenseDays', headerName: 'Días de Licencia', sortable: false, filterable: false, cellRenderer: (data) => {
              if (!data.lastUpdate) return 'N/A';
              const lastUpdate = new Date(data.lastUpdate);
              const expirationDate = new Date(lastUpdate);
              expirationDate.setDate(lastUpdate.getDate() + 63);
              const today = new Date();
              const daysLeft = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft < 0) {
                return <span className={styles.redText}>Vencida</span>;
              }
              if (daysLeft <= 15) {
                return <span className={styles.yellowText}>{daysLeft} días</span>;
              }
              return <span className={styles.greenText}>{daysLeft} días</span>;
            } },
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
          <button type="submit">Guardar</button>
          <button type="button" onClick={toggleForm}>Cancelar</button>
        </form>
      </Modal>
      <Modal isOpen={showDateModal} onClose={() => setShowDateModal(false)} title={selectedClient?.name}>
        <div className="modalForm">
          <div className="formGroup">
            <label>Fecha *</label>
            <input 
              type="date" 
              value={customDate} 
              onChange={(e) => setCustomDate(e.target.value)} 
              max={moment.tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD')}
              min={moment.tz('America/Argentina/Buenos_Aires').subtract(1, 'year').format('YYYY-MM-DD')}
              data-tip="Selecciona la fecha de última actualización"
            />
          </div>
          <button type="button" onClick={handleCustomDateSubmit} disabled={!customDate}>Actualizar</button>
          <button type="button" onClick={() => setShowDateModal(false)}>Cancelar</button>
        </div>
      </Modal>
      <Modal isOpen={showAccessModal} onClose={() => setShowAccessModal(false)} title={`Gestionar Accesos - ${selectedClient?.name}`}>
        <form onSubmit={handleAccessSubmit(handleAccessSubmitForm)} className="modalForm">
          <div className="formGroup">
            <label>Accesos</label>
            {fields.map((field, index) => (
              <div key={field.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--sidebar-text)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{field.name || `Acceso ${index + 1}`}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => copyToClipboard(field.ID, 'ID')}
                      title="Copiar ID"
                      style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                    >
                      <FaCopy />
                    </button>
                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => copyToClipboard(field.password, 'Contraseña')}
                      title="Copiar Contraseña"
                      style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                    >
                      <FaCopy />
                    </button>
                    <button
                      type="button"
                      className="secondaryBtn"
                      onClick={() => toggleAccessExpansion(field.id)}
                      style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                    >
                      {expandedAccess[field.id] ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>
                {expandedAccess[field.id] && (
                  <div style={{ marginTop: '1rem' }}>
                    <div className="formGroup">
                      <label>Nombre *</label>
                      <input {...registerAccess(`access.${index}.name`)} placeholder="Nombre del acceso" />
                      {accessErrors.access?.[index]?.name && <p className={styles.error}>{accessErrors.access[index]?.name?.message}</p>}
                    </div>
                    <div className="formGroup">
                      <label>ID *</label>
                      <input {...registerAccess(`access.${index}.ID`)} placeholder="ID del acceso" />
                      {accessErrors.access?.[index]?.ID && <p className={styles.error}>{accessErrors.access[index]?.ID?.message}</p>}
                    </div>
                    <div className="formGroup">
                      <label>Contraseña *</label>
                      <input {...registerAccess(`access.${index}.password`)} placeholder="Ingresa la contraseña" />
                      {accessErrors.access?.[index]?.password && <p className={styles.error}>{accessErrors.access[index]?.password?.message}</p>}
                    </div>
                    <button type="button" className="secondaryBtn" onClick={() => remove(index)}>Eliminar Acceso</button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              className="secondaryBtn"
              onClick={() => append({ name: '', ID: '', password: '' })}
              style={{ marginTop: '1rem' }}
            >
              Agregar Acceso
            </button>
          </div>
          <button type="submit" disabled={fields.length === 0}>Guardar</button>
          <button type="button" onClick={() => setShowAccessModal(false)}>Cancelar</button>
        </form>
      </Modal>
    </div>
  );
};

export default Clients;