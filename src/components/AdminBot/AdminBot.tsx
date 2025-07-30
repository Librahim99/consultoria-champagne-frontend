import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import QRCode from 'react-qr-code';
import styles from './AdminBot.module.css';
import { ThemeContext } from '../../contexts/ThemeContext';

const AdminBot: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected' | 'error'>('loading');
  const [qr, setQr] = useState<string | null>(null);
  const { theme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [lastSendTime, setLastSendTime] = useState<number>(0);
  const [logoutPassword, setLogoutPassword] = useState<string>('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Estados para sesiones
  const [sessions, setSessions] = useState<string[]>([]);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [switching, setSwitching] = useState(false);

  // CAMBIO: Estado para nueva sesión
  const [newSessionName, setNewSessionName] = useState<string>('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      toast.error('No se encontró token. Inicia sesión para usar AdminBot');
      setStatus('error');
      return;
    }
    setToken(storedToken);
  }, []);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/bot/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.data.status);
      setQr(res.data.qr || null);
      setCurrentSession(res.data.sessionId); // Actualiza sesión actual
    } catch (error) {
      toast.error('Error al obtener estado del bot');
      setStatus('error');
    }
  };

  // Fetch sesiones disponibles
  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/bot/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(res.data.sessions);
    } catch (error) {
      toast.error('Error al obtener sesiones disponibles');
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatus();
      fetchSessions(); // Fetch inicial de sesiones
      const interval = setInterval(fetchStatus, status === 'connected' ? 10000 : 5000);
      return () => clearInterval(interval);
    }
  }, [token, status]);

  const handleStartSession = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/start-session`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Iniciando sesión del bot... Espera el QR');
      fetchStatus();
    } catch (error) {
      toast.error('Error al iniciar sesión del bot');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!token || !logoutPassword) return;
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/logout`, { password: logoutPassword }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Sesión cerrada con éxito');
      setShowPasswordInput(false);
      setLogoutPassword('');
      fetchStatus();
    } catch (error) {
      toast.error('Error al cerrar sesión: ' + (error || 'Intenta de nuevo'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!token) return;
    const now = Date.now();
    if (now - lastSendTime < 60000) {
      toast.warning('Espera 1 minuto antes de enviar otro mensaje de prueba');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/send-test`, { message: 'Mensaje de prueba desde AdminBot' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Mensaje de prueba enviado a usuarios TOTAL_ACCESS');
      setLastSendTime(now);
    } catch (error) {
      toast.error('Error al enviar mensaje de prueba');
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar sesión
  const handleSwitchSession = async (newSessionId: string) => {
    if (!token || switching) return;
    setSwitching(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/switch-session`, { sessionId: newSessionId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message);
      setCurrentSession(newSessionId);
      fetchStatus(); // Actualiza status inmediatamente
      await fetchSessions(); // Recarga sesiones si nueva
    } catch (error) {
      toast.error('Error al cambiar sesión');
    } finally {
      setSwitching(false);
    }
  };

  // CAMBIO: Función para agregar nueva sesión y switch auto
  const handleAddNewSession = async () => {
    if (!token || !newSessionName.trim() || switching) {
      toast.warning('Ingresa un nombre válido para la nueva sesión');
      return;
    }
    setSwitching(true);
    try {
      // Llama a switch con el nuevo ID (crea implícitamente)
      await handleSwitchSession(newSessionName);
      toast.success(`Sesión '${newSessionName}' creada y activada. Reconectando...`);
      setNewSessionName(''); // Limpia input
    } catch (error) {
      toast.error('Error al crear nueva sesión');
    } finally {
      setSwitching(false);
    }
  };


  const handleResetSession = async () => {
    if (!token || switching) return;
    if (!window.confirm('¿Resetear sesión actual? Perderás creds, escanea QR nuevo.')) return;
    setSwitching(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/reset-session`, { sessionId: currentSession }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(res.data.message);
      fetchStatus();
      fetchSessions();
    } catch (error) {
      toast.error('Error al resetear sesión');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Administración del Bot</h2>
      <p className={styles.status}>Estado: 
        {status === 'connected' ? 'Conectado ✅' : 
         status === 'disconnected' ? 'Desconectado ❌' : 
         status === 'loading' ? 'Cargando...' : 'Error ⚠️'}
      </p>
      {/* Selector de sesiones */}
      <div className={styles.sessionSelector}>
        <label>Sesión actual: {currentSession}</label>
        <select 
          value={currentSession} 
          onChange={(e) => handleSwitchSession(e.target.value)} 
          disabled={switching || loading || !token || sessions.length === 0}
          className={styles.select}
        >
          {sessions.map((sess) => (
            <option key={sess} value={sess}>{sess}</option>
          ))}
        </select>
        <button 
          onClick={handleResetSession} 
          disabled={switching || loading || !token || status !== 'disconnected'} 
          className={styles.button}
        >
          Reset Sesión
        </button>
        {switching && <p>Cambiando sesión...</p>}
      </div>
      {/* CAMBIO: Input y botón para nueva sesión */}
      <div className={styles.newSession}>
        <input 
          type="text" 
          value={newSessionName} 
          onChange={(e) => setNewSessionName(e.target.value)} 
          placeholder="Nombre de nueva sesión (ej. nuevo-dispositivo)" 
          className={styles.input}
          disabled={switching || loading || !token}
        />
        <button 
          onClick={handleAddNewSession} 
          disabled={switching || loading || !token || !newSessionName.trim()} 
          className={styles.button}
        >
          {switching ? 'Creando...' : 'Agregar Nueva Sesión'}
        </button>
      </div>
      {status === 'disconnected' && qr && (
        <div className={styles.qrContainer}>
          <p>Escanea el QR para iniciar sesión (máximo 3 intentos):</p>
          <div className={styles.qrWrapper}>
            <QRCode value={qr} size={256} />
          </div>
        </div>
      )}
      {status === 'disconnected' && !qr && (
        <button 
          onClick={handleStartSession} 
          disabled={loading || !token} 
          className={styles.button}
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>
      )}
      <div className={styles.buttons}>
        <button 
          onClick={() => setShowPasswordInput(true)} 
          disabled={status !== 'connected' || loading || !token || showPasswordInput} 
          className={styles.button}
        >
          Cerrar Sesión
        </button>
        {showPasswordInput && (
          <div className={styles.passwordInput}>
            <input 
              type="password" 
              value={logoutPassword} 
              onChange={(e) => setLogoutPassword(e.target.value)} 
              placeholder="Ingresa la contraseña para cerrar sesión" 
              className={styles.input}
            />
            <button onClick={handleLogout} disabled={loading || !logoutPassword} className={styles.button}>
              {loading ? 'Cerrando...' : 'Confirmar'}
            </button>
            <button onClick={() => { setShowPasswordInput(false); setLogoutPassword(''); }} className={styles.cancelButton}>
              Cancelar
            </button>
          </div>
        )}

        <button 
          onClick={handleSendTest} 
          disabled={status !== 'connected' || loading || !token || (Date.now() - lastSendTime < 60000)} 
          className={styles.button}
        >
          {loading ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
        </button>
      </div>
    </div>
  );
};

export default AdminBot;