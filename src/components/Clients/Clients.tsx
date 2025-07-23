import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ColumnState } from 'ag-grid-community';
import { Client, DecodedToken } from '../../utils/interfaces';
import styles from './Clients.module.css';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string>('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', common: '', vip: false, active: true });
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRank, setUserRank] = useState<string>('');
  const gridRef = useRef<AgGridReact>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
    }

    const fetchClients = async () => {
      try {
        const res = await axios.get<Client[]>('http://localhost:5000/api/clients', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClients(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar clientes');
      }
    };
    fetchClients();
  }, []);

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setNewClient({ name: client.name, common: client.common, vip: client.vip, active: client.active });
    setShowAddForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (editingClient) {
      setNewClient({
        ...newClient,
        [name]: type === 'checkbox' ? checked : value,
      });
    } else {
      setNewClient({
        ...newClient,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      if (editingClient) {
        const res = await axios.put(`http://localhost:5000/api/clients/${editingClient._id}`, newClient, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClients(clients.map((client) => (client._id === editingClient._id ? res.data : client)));
        setEditingClient(null);
      } else {
        const res = await axios.post('http://localhost:5000/api/clients', newClient, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClients([...clients, res.data]);
      }
      setNewClient({ name: '', common: '', vip: false, active: true });
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar cliente');
    }
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    setEditingClient(null);
    setNewClient({ name: '', common: '', vip: false, active: true });
  };

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'common', headerName: 'Común', sortable: true, resizable: true },
      { field: 'name', headerName: 'Nombre', sortable: true, resizable: true },
      { field: 'lastUpdate', headerName: 'Última Actualización', sortable: true, resizable: true },
      { field: 'vip', headerName: 'VIP', sortable: true, resizable: true, valueFormatter: params => params.value ? 'Sí' : 'No' },
      { field: 'active', headerName: 'Activo', sortable: true, resizable: true, valueFormatter: params => params.value ? 'Sí' : 'No' },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
    }),
    []
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    const savedColumnOrder = localStorage.getItem('clientsColumnOrder');
    if (savedColumnOrder) {
      const columnState: ColumnState[] = JSON.parse(savedColumnOrder);
      params.api.applyColumnState({ state: columnState });
    }
    gridRef.current!.api.sizeColumnsToFit();
  }, []);

  const onColumnMoved = useCallback(() => {
    if (gridRef.current) {
      const columnState = gridRef.current.api.getColumnState();
      localStorage.setItem('clientsColumnOrder', JSON.stringify(columnState));
    }
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clientes</h1>
      {error && <p className={styles.error}>{error}</p>}
      {userRank === 'Acceso Total' && (
        <button onClick={toggleAddForm} className={styles.button}>
          {showAddForm ? 'Cancelar' : 'Agregar Cliente'}
        </button>
      )}
      <div className={styles.gridWrapper}>
        <AgGridReact
          ref={gridRef}
          rowData={clients}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          animateRows={true}
          domLayout='autoHeight'
          className={styles.agGrid}
        />
      </div>
      {(showAddForm || editingClient) && userRank === 'Acceso Total' && (
        <div className={styles.formContainer}>
          <h2>{editingClient ? `Editar Cliente: ${editingClient.name}` : 'Agregar Cliente'}</h2>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label>Nombre</label>
              <input type="text" name="name" value={newClient.name} onChange={handleInputChange} required />
            </div>
            <div className={styles.formGroup}>
              <label>Común (4 dígitos)</label>
              <input
                type="text"
                name="common"
                value={newClient.common}
                onChange={handleInputChange}
                pattern="[0-9]{4}"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>VIP</label>
              <input type="checkbox" name="vip" checked={newClient.vip} onChange={handleInputChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Activo</label>
              <input type="checkbox" name="active" checked={newClient.active} onChange={handleInputChange} />
            </div>
            <button type="submit" className={styles.button}>
              {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingClient(null);
              }}
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

export default Clients;