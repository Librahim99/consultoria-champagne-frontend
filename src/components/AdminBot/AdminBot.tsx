import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import QRCode from 'react-qr-code';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import styles from './AdminBot.module.css';

const AdminBot: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected' | 'error'>('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [lastSendTime, setLastSendTime] = useState<number>(0);
  const [logoutPassword, setLogoutPassword] = useState<string>(''); // Estado para contraseña de logout
  const [showPasswordInput, setShowPasswordInput] = useState(false); // Mostrar input de contraseña

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
    } catch (error) {
      toast.error('Error al obtener estado del bot');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatus();
      const interval = setInterval(fetchStatus, status === 'connected' ? 10000 : 5000); // Polling optimizado: 5s si disconnected para reflejar cambios más rápido, 10s si connected
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
      fetchStatus(); // Refresca inmediatamente
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
    if (now - lastSendTime < 60000) { // Cooldown de 60 segundos
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

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Administración del Bot</h2>
      <p className={styles.status}>Estado: 
        {status === 'connected' ? 'Conectado ✅' : 
         status === 'disconnected' ? 'Desconectado ❌' : 
         status === 'loading' ? 'Cargando...' : 'Error ⚠️'}
      </p>
      {status === 'disconnected' && qr && (
        <div className={styles.qrContainer}>
          <p>Escanea el QR para iniciar sesión (máximo 3 intentos):</p>
          <div className={styles.qrWrapper}> {/* Wrapper para borders completos y centro */}
              <QRCode value={qr} size={256} />
            </div>
        </div>
      )}
      {status === 'disconnected' && !qr && (
        <button 
          onClick={handleStartSession} 
          disabled={loading || !token} 
          className={styles.button}
          data-tip="Inicia el proceso de conexión del bot mostrando el QR (requiere token válido)"
          data-for="start-tooltip"
        >
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>
      )}
      <div className={styles.buttons}>
        <button 
          onClick={() => setShowPasswordInput(true)} 
          disabled={status !== 'connected' || loading || !token || showPasswordInput} 
          className={styles.button}
          data-tip="Cierra la sesión actual del bot y permite reconectar (requiere contraseña y token válido)"
          data-for="logout-tooltip"
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
        <ReactTooltip id="logout-tooltip" place="top" />

        <button 
          onClick={handleSendTest} 
          disabled={status !== 'connected' || loading || !token || (Date.now() - lastSendTime < 60000)} 
          className={styles.button}
          data-tip="Envía un mensaje de prueba a todos los usuarios con rank TOTAL_ACCESS y número registrado (requiere token válido, cooldown 1 min)"
          data-for="test-tooltip"
        >
          {loading ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
        </button>
        <ReactTooltip id="test-tooltip" place="top" />
        <ReactTooltip id="start-tooltip" place="top" />
      </div>
    </div>
  );
};

export default AdminBot;