import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './CrearMeetForm.module.css';

interface CrearMeetFormProps {
  onClose: () => void;
}

interface Client {
  _id: string;
  name: string;
  email?: string;
}

const CrearMeetForm: React.FC<CrearMeetFormProps> = ({ onClose }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/clients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClients(response.data);
      } catch (err) {
        console.error('Error al cargar los clientes:', err);
      }
    };
    fetchClients();
  }, []);

  const crearReunion = async () => {
    if (!clientId || !title || !date || !startTime || !endTime) {
      return alert('Completa todos los campos requeridos.');
    }

    const accessToken = localStorage.getItem('google_access_token');
    if (!accessToken) {
      return alert('No se encontró el token de Google. Iniciá sesión con Google.');
    }

    const client = clients.find(c => c._id === clientId);
    if (!client?.email) {
      return alert('El cliente seleccionado no tiene un email asignado.');
    }

    const [day, month, year] = date.split('/');
    const formattedDate = `${year}-${month}-${day}`;
    const startDateTime = `${formattedDate}T${startTime}:00-03:00`;
    const endDateTime = `${formattedDate}T${endTime}:00-03:00`;

    const evento = {
      summary: title,
      description,
      start: { dateTime: startDateTime, timeZone: 'America/Argentina/Buenos_Aires' },
      end: { dateTime: endDateTime, timeZone: 'America/Argentina/Buenos_Aires' },
      attendees: [{ email: client.email }],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
        },
      },
    };

    try {
      setLoading(true);
      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        evento,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meetLink = response.data?.hangoutLink;
      if (meetLink) {
        alert(`✅ Reunión creada con éxito: ${meetLink}`);
        navigator.clipboard.writeText(meetLink);
        onClose(); // cerrar modal
      } else {
        alert('Evento creado, pero no se generó enlace Meet.');
      }
    } catch (err: any) {
      console.error('❌ Error al crear la reunión:', err.response?.data || err.message || err);
      alert('Error al crear la reunión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); crearReunion(); }}>
      <label>Cliente</label>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
        <option value=""> Seleccioná un cliente </option>
        {clients.map(client => (
  <option key={client._id} value={client._id}>
    {client.name} {client.email ? `(${client.email})` : '(sin email)'}
  </option>
))}

      </select>

      <label>Título</label>
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label>Descripción</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

      <label>Fecha</label>
      <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="dd/mm/yyyy" required />

      <label>Hora de inicio</label>
      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />

      <label>Hora de fin</label>
      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />

      <button type="submit" className={styles.submitBtn} disabled={loading}>
        {loading ? 'Creando...' : 'CREAR REUNIÓN'}
      </button>
    </form>
  );
};

export default CrearMeetForm;
