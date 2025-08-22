import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { type Assistance, Client, User, DecodedToken } from '../../utils/interfaces';
import styles from './Assistance.module.css';
import CustomTable from '../CustomTable/CustomTable';
import { ranks } from '../../utils/enums';
import { FaEdit, FaTrash, FaPlus, FaFileExport, FaFileArchive, FaFileExcel } from 'react-icons/fa'; // Agregado FaPlus para Nueva Asistencia
import Modal from '../Modal/Modal';
import { toast } from 'react-toastify';
import { useContextMenu } from '../../contexts/UseContextMenu';
import Spinner from '../Spinner/Spinner';
import moment from 'moment'; // Para formatear fechas (ya tienes moment-timezone en package.json)
import * as XLSX from 'xlsx'; // Para exportar a Excel

const Assistances: React.FC = () => {
  const [assistances, setAssistances] = useState<Assistance[]>([]);
  const [error, setError] = useState<string>('');
  const [editingAssistance, setEditingAssistance] = useState<Assistance | null>(null);
  const [newAssistance, setNewAssistance] = useState<Assistance>({
    _id: '', clientId: '', userId: '', date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0,
    incidentId: null, pendingId: null,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  
    const { showMenu } = useContextMenu();
  const [userRank, setUserRank] = useState<string>('');
  const [loggedInUserId, setLoggedInUserId] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clientSearch, setClientSearch] = useState('');
const [filteredClient, setFilteredClient] = useState<Client | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [userFilter, setUserFilter] = useState('me');
const [dateFilter, setDateFilter] = useState('month');
const [disableSubmit, setDisableSubmimt] = useState(false)
const clientInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (showAddForm && clientInputRef.current) {
    clientInputRef.current.focus();
  }
}, [showAddForm]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return setError('No token found in localStorage');
    try {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
      setLoggedInUserId(decoded.id);
      setNewAssistance(prev => ({ ...prev, userId: decoded.id }));
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      setError('Token inválido o corrupto');
    }

    const fetchData = async () => {
      try {
        const [clientsRes, usersRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/clients/minimal`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/users/minimal`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
      } catch (err: any) {
        console.error('Fetch Error:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Error al cargar datos');
      }
    };
    if (userRank && !error) fetchData();
  }, [userRank, error]);


  const getClientName = (clientId: string | null) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : 'Desconocido';
  };

  const getClient = (clientId: string | null) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client : null;
  };

  const getUserName = (userId: string | null) => {
    const user = users.find(u => u._id === userId);
    return user ? user.name : 'Desconocido';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAssistance(prev => ({ ...prev, [name]: value === '' ? null : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return setError('No token available for submission');

    if (!newAssistance.clientId || !newAssistance.detail || !newAssistance.contact || !newAssistance.timeSpent) {
      toast.error('Faltan campos requeridos')
      return
    }

    setDisableSubmimt(true)
    

    const assistanceToSend = { ...newAssistance, userId: loggedInUserId };
    try {
      if (editingAssistance) {
        const res = await axios.put(`${process.env.REACT_APP_API_URL}/api/assistances/${editingAssistance._id}`, assistanceToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssistances(assistances.map(a => (a._id === editingAssistance._id ? res.data : a)));
        setEditingAssistance(null);
        toast.success('Asistencia modificada con exito')
        setDisableSubmimt(false)
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/assistances`, assistanceToSend, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssistances([...assistances, res.data]);
        toast.success('Asistencia creada con exito')
        setDisableSubmimt(false)
      }
      setShowAddForm(false);
      setFilteredClient(null)
      setClientSearch('')
      setNewAssistance({ _id: '', clientId: '', userId: loggedInUserId, date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0, incidentId: null, pendingId: null });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar asistencia');
    }
  };

  // Función para manejar edición (usada en Modificar y Asignar)
  const handleEdit = useCallback((assistance: Assistance, assignOnly: boolean = false) => {
    if (userRank === ranks.GUEST) {
      setError('No tienes permisos para editar');
      return;
    }
    setEditingAssistance(assistance);
    setFilteredClient(getClient(assistance.clientId))
    setClientSearch(getClientName(assistance.clientId))
    setNewAssistance(assistance);
    setShowAddForm(true);
  }, [userRank, getClient, getClientName]);


  const handleExport = useCallback(() => {
  if (!loggedInUserId) {
    toast.error('Usuario no identificado');
    return;
  }
const today = new Date();
  today.setHours(0, 0, 0, 0); // Establece el inicio del día
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1); // Fin del día

  const userAssistances = assistances.filter(a => 
    a.userId === loggedInUserId && 
    new Date(a.date) >= today && 
    new Date(a.date) < tomorrow
  );

  if (userAssistances.length === 0) {
    toast.info('No hay asistencias para exportar');
    return;
  }

  const userName = getUserName(loggedInUserId);
  const fechaCabecera = today.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).replace(/\//g, '-');

  let content = `►►►► FECHA: ${fechaCabecera} 00:00 ◄◄◄◄ \n`;
      content += `EJECUTIVO: ${userName}\n`;

  userAssistances
    .sort((a, b) => (b.sequenceNumber ?? 0) - (a.sequenceNumber ?? 0)) // ordenar descendente
    .forEach((a) => {
      const clientName = getClientName(a.clientId);
      const nro = a.sequenceNumber ?? 'SIN NRO';
      const duracion = `${a.timeSpent} Minutos`;
      const detalle = a.detail.trim();
      const contact = a.contact.trim()
      content += '------------------------';
      content += `\nNRO: ${nro}\n`;
      content += `CLIENTE: ${clientName}\n`;
      content += `DETALLE: ${detalle}\n`;
      content += `USUARIO: ${contact}\n`; 
      content += `DURACION: ${duracion}\n`;
    });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Asistencias_${fechaCabecera.replace(/-/g, '_')}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success('Asistencias del dia exportadas en formato TXT');
}, [assistances, loggedInUserId, getClientName, getUserName]);



const handleExportAll = useCallback(() => {
  if (assistances.length === 0) {
    toast.info('No hay asistencias visibles para exportar');
    return;
  }
  
  // Ordenar por fecha ascendente
  const sortedAssistances = [...assistances].sort((a: Assistance, b: Assistance) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Agrupar por fecha y dentro por usuario
  const groupedByDate = sortedAssistances.reduce((acc: {[key: string]: {[key: string]: Assistance[]}}, a: Assistance) => {
    const dateKey = moment(a.date).format('DD-MM-YY');
    const userKey = a.userId; // O getUserName(a.userId) si querés el nombre como clave

    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][userKey]) acc[dateKey][userKey] = [];
    acc[dateKey][userKey].push(a);

    return acc;
  }, {});

  let content = '';

  Object.keys(groupedByDate).sort().forEach(dateKey => {
    content += `►►►► FECHA: ${dateKey} ◄◄◄◄ \n\n`;

    Object.keys(groupedByDate[dateKey]).sort().forEach(userKey => {
      const userAssistances = groupedByDate[dateKey][userKey];
      const userName = getUserName(userKey) || 'Desconocido';

      content += `EJECUTIVO: ${userName} (${dateKey})\n`;

      userAssistances.forEach((a: Assistance) => {
        const clientName = getClientName(a.clientId) || 'Sin cliente';
        const nro = a.sequenceNumber !== null && a.sequenceNumber !== undefined ? a.sequenceNumber : 'SIN NRO';
        const duracion = `${a.timeSpent} Minutos`;
        const detalle = a.detail.trim();
        const contact = a.contact.trim();
        content += '------------------------';
        content += `\nNRO: ${nro}\n`;
        content += `CLIENTE: ${clientName}\n`;
        content += `DETALLE: ${detalle}\n`;
        content += `USUARIO: ${contact}\n`;
        content += `DURACION: ${duracion}\n`;
      });

      content += `\nTotal asistencias de ${userName}: ${userAssistances.length}\n\n`;
    });
  });

  const todayFormatted = moment().format('DD-MM-YY');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Asistencias_Todas_${todayFormatted.replace(/-/g, '_')}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast.success(`Exportadas ${assistances.length} asistencias visibles en formato TXT`);
}, [assistances, getClientName, getUserName]);


const handleExportExcel = useCallback(() => {
  if (assistances.length === 0) {
    toast.info('No hay asistencias visibles para exportar');
    return;
  }

  const sortedAssistances = [...assistances].sort((a: Assistance, b: Assistance) => {
    const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateComparison !== 0) return dateComparison;
    const userAName = getUserName(a.userId) || '';
    const userBName = getUserName(b.userId) || '';
    return userAName.localeCompare(userBName);
  });

  const excelData = sortedAssistances.map((a: Assistance) => ({
    Fecha: moment(a.date).format('DD-MM-YYYY'),
    Usuario: getUserName(a.userId) || 'Desconocido',
    Cliente: getClientName(a.clientId) || 'Sin cliente',
    Detalle: a.detail.trim(),
    Contacto: a.contact.trim(),
    Duración: `${a.timeSpent} Minutos`,
    Numero: a.sequenceNumber !== null && a.sequenceNumber !== undefined ? a.sequenceNumber : 'SIN NRO',
  }));

// Crear worksheet vacío
const worksheet = XLSX.utils.aoa_to_sheet([]);

// Agregar título en A1, fusionado A1:G1
XLSX.utils.sheet_add_aoa(worksheet, [['Reporte de Asistencias - Consultoría Champagne']], { origin: 'A1' });
worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]; // Fusiona A1 a G1

// Agregar encabezados en A2
XLSX.utils.sheet_add_aoa(worksheet, [['Fecha', 'Usuario', 'Cliente', 'Detalle', 'Contacto', 'Duración', 'Numero']], { origin: -1 });

['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2'].forEach(cell => {
  worksheet[cell] = { ...worksheet[cell], s: { font: { bold: true } } };
});

// Agregar datos en A3 (json_to_sheet sin origin, datos se escriben después de las filas existentes)
// const excelDataWithOffset = excelData.map((row, index) => ({ ...row, __rowNum__: index + 3 })); // Añadimos offset para debug
XLSX.utils.sheet_add_json(worksheet, excelData, { origin: -1, skipHeader: true });

// Congelar encabezado (título y encabezados) hasta fila 2
worksheet['!freeze'] = { xSplit: 0, ySplit: 2 };

// Auto-ancho de columnas
const maxWidths = [
  12, // Fecha
  20, // Usuario
  20, // Cliente
  30, // Detalle
  15, // Contacto
  10, // Duración
  10, // Numero
];
worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));



const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias');

  const todayFormatted = moment().format('DD-MM-YY');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Reporte_de_Asistencias_${dateFilter === 'week' ? 'Semanal' : (dateFilter === 'month' ? 'Mensual' : 'Historico')}_${todayFormatted.replace(/-/g, '_')}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Exportadas ${assistances.length} asistencias visibles en formato Excel`);
}, [assistances, getClientName, getUserName]);


  // Nueva función para manejar Nueva Asistencia
  const handleNewAssistance = useCallback(() => {
    if (userRank === ranks.GUEST) {
      setError('No tienes permisos para crear asistencias');
      return;
    }
    setEditingAssistance(null);
    setNewAssistance({ _id: '', clientId: '', userId: loggedInUserId, date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0, incidentId: null, pendingId: null });
    setShowAddForm(true);
  }, [userRank, loggedInUserId]);

  // Función para eliminar
  const handleDelete = useCallback(async (assistance: Assistance) => {
    if (userRank !== ranks.TOTALACCESS) {
      setError('No tienes permisos para eliminar');
      return;
    }
    if (!window.confirm('¿Estás seguro de eliminar esta asistencia?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/assistances/${assistance._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssistances(assistances.filter(a => a._id !== assistance._id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar asistencia');
    }
  }, [assistances, userRank]);

const getContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const menuItems = [
    {
      label: ' Nueva asistencia',
      icon: <FaPlus />,
      onClick: handleNewAssistance
    },
    {
      label: ' Exportar mis asistencias',
      icon: <FaFileExport />,
      onClick: () => handleExport()
    },
     {
      label: ' Exportar Asistencias',
      icon: <FaFileExport />,
      onClick: () => {},
      children: [
        {
      label: ' Texto',
      icon: <FaFileArchive />,
      onClick: () => handleExportAll()
    },
    {
      label: ' Excel',
      icon: <FaFileExcel />,
      onClick: () => handleExportExcel()
    }
  ]
    },
  ]
   showMenu(e.clientX, e.clientY, menuItems) 
  },[showMenu,handleNewAssistance, handleExport, handleExportAll])


  // Actualizado: Agregar Nueva Asistencia al menú contextual
  const getRowContextMenu = (row: Assistance) => [
    {
      label: ' Nueva asistencia',
      icon: <FaPlus />,
      onClick: handleNewAssistance
    },
    {
      label: ' Exportar mis asistencias',
      icon: <FaFileExport />,
      onClick: () => handleExport()
    },
    {
      label: ' Exportar Asistencias',
      icon: <FaFileExport />,
      onClick: () => {},
      children: [
        {
      label: ' Texto',
      icon: <FaFileArchive />,
      onClick: () => handleExportAll()
    },
    {
      label: ' Excel',
      icon: <FaFileExcel />,
      onClick: () => handleExportExcel()
    }
  ]
    },
    {
      label: ' Modificar',
      icon: <FaEdit />,
      onClick: () => handleEdit(row),
      hide: loggedInUserId !== row.userId
    },
    {
      label: ' Eliminar',
      icon: <FaTrash />,
      onClick: () => handleDelete(row),
      hide: row.userId !== loggedInUserId,
    }
  ];

  


  const fetchAssistances = useCallback(async () => {
  setIsLoading(true);
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const res = await axios.get<Assistance[]>(`${process.env.REACT_APP_API_URL}/api/assistances`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { userFilter, dateFilter }
    });
    setAssistances(res.data);
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || 'Error fetching assistances';
    setError(errorMsg);
    toast.error(errorMsg);
  } finally {
    setIsLoading(false);
  }
}, [userFilter, dateFilter]);

useEffect(() => {
  fetchAssistances();
}, [fetchAssistances]); // Se dispara cuando fetchAssistances cambia (i.e., userFilter/dateFilter)

const handleFilterChange = (type: 'user' | 'date' | 'status', value: string) => {
  if (type === 'user') setUserFilter(value);
  if (type === 'date') setDateFilter(value);
};
 if(!users.length || !assistances || !clients.length) return  <Spinner/>
  return (
    <div className={styles.container}>
      <h1 className={styles.title}> 🎧 Asistencias 🎧 </h1>
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.fab} title="Agregar Asistencia" onClick={() => {
        setEditingAssistance(null);
        setNewAssistance({ _id: '', clientId: '', userId: loggedInUserId, date: new Date().toISOString(), detail: '', contact: '', timeSpent: 0, incidentId: null, pendingId: null });
        setShowAddForm(true);
      }}>+</button>
      <div onContextMenu={(e) => getContextMenu(e)} style={{ width: '100%' }}>
        <CustomTable
          rowData={assistances}
          columnDefs={[
            { field: 'clientId', headerName: 'Cliente', valueFormatter: (value) => getClientName(value), sortable: true, filterable: true },
            { field: 'userId', headerName: 'Usuario', valueFormatter: (value) => getUserName(value), sortable: true, filterable: true },
            { field: 'date', headerName: 'Fecha', valueFormatter: (value) => new Date(value).toLocaleDateString(), sortable: true, filterable: true },
            { field: 'detail', headerName: 'Detalle', sortable: true, filterable: true },
            { field: 'contact', headerName: 'Contacto', sortable: true, filterable: true },
            { field: 'timeSpent', headerName: 'Tiempo Gastado (min)', sortable: true, filterable: true },
            { field: 'sequenceNumber', headerName: 'Número', valueFormatter: (v) => v || 'Sin número asignado', sortable: true, filterable: true },
          ]}
          pagination={true}
          defaultPageSize={15}
          searchable={true}
          customizable={true}
          storageKey="assistanceTable"
          onRowContextMenu={getRowContextMenu}
          enableUserFilter={true}
enableDateFilter={true}
enableStatusFilter={false}
onFilterChange={handleFilterChange}
        />
      </div>
      <Modal
        isOpen={showAddForm}
        onClose={() => {setShowAddForm(false); setFilteredClient(null); setClientSearch('')}}
        title={editingAssistance ? 'Editar Asistencia' : 'Agregar Asistencia'}
      >
        <form onSubmit={handleSubmit} className="modalForm">
          <div className="formGroup">
  <label>Cliente *</label>
  <input
    ref={clientInputRef}
    type="text"
    placeholder="Buscar cliente..."
    value={clientSearch}
    onChange={(e) => {
      const val = e.target.value;
      setClientSearch(val);
      const match = clients.find(c =>
        c.name.toLowerCase().includes(val.toLowerCase()) ||
        (c.common && c.common.toLowerCase().includes(val.toLowerCase()))
      );
      
      
      if (match) {
        setFilteredClient(match);
        setNewAssistance(prev => ({ ...prev, clientId: match._id }));
      } else {
        setFilteredClient(null);
        setNewAssistance(prev => ({ ...prev, clientId: '' }));
      }
      if(val == '') setFilteredClient(null)
    }}
    required
  />
  {filteredClient && (
    <div className={styles.clientText}>
      ➤ {filteredClient.name}
    </div>
  )}
</div>
          <div className="formGroup">
            <label>Usuario *</label>
            <select name="userId" value={newAssistance.userId || ''} onChange={handleInputChange} required>
              <option value="">Seleccione un usuario</option>
              {users.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}
            </select>
          </div>
          <div className="formGroup">
            <label>Fecha</label>
            <input type="date" name="date" value={new Date(newAssistance.date).toISOString().split('T')[0]} onChange={handleInputChange} required />
          </div>
          <div className="formGroup">
            <label>Detalle *</label>
            <textarea name="detail" value={newAssistance.detail || ''} onChange={handleInputChange} required />
          </div>
          <div className="formGroup">
            <label>Contacto *</label>
            <input type="text" name="contact" value={newAssistance.contact || ''} onChange={handleInputChange} required />
          </div>
          <div className="formGroup">
            <label>Tiempo Gastado (min) *</label>
            <input type="number" name="timeSpent" value={newAssistance.timeSpent} onChange={handleInputChange} required />
          </div>
           {!disableSubmit && <button type="submit">{editingAssistance ? 'Actualizar' : 'Crear Asistencia'}</button>}
           {disableSubmit && <button>Cargando...</button>}
        </form>
      </Modal>
    </div>
  );
};

export default Assistances;