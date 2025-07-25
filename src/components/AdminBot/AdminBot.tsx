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
      const interval = setInterval(fetchStatus, status === 'connected' ? 30000 : 15000); // Polling optimizado: más lento si conectado
      return () => clearInterval(interval);
    }
  }, [token, status]);

  const handleLogout = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Sesión cerrada con éxito');
      fetchStatus();
    } catch (error) {
      toast.error('Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/send-test`, { message: 'Mensaje de prueba desde AdminBot' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Mensaje de prueba enviado a usuarios TOTAL_ACCESS');
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
          <p>Escanea el QR para iniciar sesión:</p>
          <div className={styles.qrWrapper}> {/* Wrapper para borders completos y centro */}
              <QRCode value={qr} size={256} />
            </div>
        </div>
      )}
      <div className={styles.buttons}>
        <button 
          onClick={handleLogout} 
          disabled={status !== 'connected' || loading || !token} 
          className={styles.button}
          data-tip="Cierra la sesión actual del bot y permite reconectar (requiere token válido)"
          data-for="logout-tooltip"
        >
          {loading ? 'Cerrando...' : 'Cerrar Sesión'}
        </button>
        <ReactTooltip id="logout-tooltip" place="top" />

        <button 
          onClick={handleSendTest} 
          disabled={status !== 'connected' || loading || !token} 
          className={styles.button}
          data-tip="Envía un mensaje de prueba a todos los usuarios con rank TOTAL_ACCESS y número registrado (requiere token válido)"
          data-for="test-tooltip"
        >
          {loading ? 'Enviando...' : 'Enviar Mensaje de Prueba'}
        </button>
        <ReactTooltip id="test-tooltip" place="top" />
      </div>
    </div>
  );
};

export default AdminBot;