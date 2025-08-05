import React, { useEffect, useState, useContext } from 'react';
import CalendarCreateButton from '../../components/GoogleAPIs/CalendarCreateButton';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../Spinner/Spinner';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { ranks } from '../../utils/enums';
import styles from './Dashboard.module.css';
import CrearMeetForm from '../../components/GoogleAPIs/CrearMeetForm';
import { FaUser, FaBug, FaClipboardCheck, FaUsers } from 'react-icons/fa';
import { FaVideo } from 'react-icons/fa';
import Modal from '../Modal/Modal';

const CrearMeetButton = ({ onClick }: { onClick: () => void }) => (
  <button className={styles.button} onClick={onClick}>
    <FaVideo style={{ marginRight: 8 }} />
    Crear Reunión Google Meet
  </button>
);


const Dashboard: React.FC = () => {
  const { userRank, userId } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const [stats, setStats] = useState({ users: 0, clients: 0, incidents: 0, pendings: 0, assistances: 0 });
  const [loading, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);

  const handleCreateGoogleMeetEvent = async () => {
  const accessToken = localStorage.getItem('google_access_token');
  if (!accessToken) {
    return alert('No se encontró el token de Google. Iniciá sesión con Google.');
  }

  const evento = {
    summary: 'Reunión de soporte técnico',
    description: 'Reunión automática desde el portal de gestión',
    start: {
      dateTime: new Date(Date.now() + 5 * 60000).toISOString(), // 5 minutos desde ahora
      timeZone: 'America/Argentina/Buenos_Aires',
    },
    end: {
      dateTime: new Date(Date.now() + 35 * 60000).toISOString(), // 30 min de duración
      timeZone: 'America/Argentina/Buenos_Aires',
    },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`, // ID único
      },
    },
    attendees: [
      { email: 'thomas.rodriguez@mantis.com.ar' }, // Opcional
    ],
  };

  try {
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
      alert(`✅ Reunión creada: ${meetLink}`);
      // Opcional: Copiar al portapapeles
      navigator.clipboard.writeText(meetLink);
    } else {
      alert('Evento creado pero sin enlace Meet.');
    }
  } catch (err) {
    console.error('Error al crear evento:', err);
    alert('Error al crear el evento de Google Meet.');
  }
};

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchStats = async () => {
      try {
        const [usersRes, clientsRes, incidentsRes, pendingsRes, assistancesRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/clients`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/pending`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/assistances`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setStats({
          users: usersRes.data.length,
          clients: clientsRes.data.length,
          incidents: incidentsRes.data.length,
          pendings: pendingsRes.data.length,
          assistances: assistancesRes.data.length,
        });
      } catch (err) {
        console.error('Error fetching stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  if (loading) return <Spinner />;

  return (
    <div className={styles.container} data-theme={theme}>
      <h1 className={styles.title}>Portal de Gestión</h1>
        <div className={styles.topActions}>
  <button className={styles.meetBtn} onClick={() => setModalOpen(true)}>
    <FaVideo className={styles.meetIcon} />
    Crear Reunión Google Meet
  </button>
</div>
      <div className={styles.grid}>
        {(userRank === ranks.TOTALACCESS || userRank === ranks.CONSULTORCHIEF) && (
          <Link to="/users" className={styles.card}>
            <FaUser className={styles.icon} />
            <h2>Usuarios</h2>
            <p>{stats.users} usuarios registrados</p>
          </Link>
        )}
        <Link to="/clients" className={styles.card}>
          <FaUsers className={styles.icon} />
          <h2>Clientes</h2>
          <p>{stats.clients} clientes activos</p>
        </Link>
        <Link to="/incidents" className={styles.card}>
          <FaBug className={styles.icon} />
          <h2>Incidencias</h2>
          <p>{stats.incidents} incidencias pendientes</p>
        </Link>
        <Link to="/assistances" className={styles.card}>
          <FaClipboardCheck className={styles.icon} />
          <h2>Asistencias</h2>
          <p>{stats.assistances} registradas</p>
        </Link>
        <Link to="/pending-tasks" className={styles.card}>
          <FaClipboardCheck className={styles.icon} />
          <h2>Pendientes</h2>
          <p>{stats.pendings} registrados</p>
        </Link>
      </div>
      <Modal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  title="Crear Reunión Google Meet"
>
  <CrearMeetForm onClose={() => setModalOpen(false)} />
</Modal>
    </div>
  );
};

export default Dashboard;
