import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BotControl: React.FC = () => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando');
  const [loading, setLoading] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Local default

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const statusRes = await axios.get(`${backendUrl}/api/bot-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(statusRes.data.status);
      if (statusRes.data.status === 'conectado') {
        setQrImage(null);
        toast.success('Bot conectado!', { position: 'top-center' });
      } else {
        const qrRes = await axios.get(`${backendUrl}/api/bot-qr`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQrImage(qrRes.data.qr);
      }
    } catch (err) {
      toast.error(`Error: ${(err as any).message}`, { position: 'top-center' });
      setStatus('desconectado');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${backendUrl}/api/bot-start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.info('Prendiendo bot...', { position: 'top-center' });
      fetchData();
    } catch (err) {
      toast.error('Error prendiendo bot', { position: 'top-center' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoadingLogout(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${backendUrl}/api/bot-logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.info('Logout bot, generando QR...', { position: 'top-center' });
      fetchData();
    } catch (err) {
      toast.error('Error logout bot', { position: 'top-center' });
    } finally {
      setLoadingLogout(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      maxWidth: '400px',
      margin: 'auto',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      minHeight: '300px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: '15px' }}>Control del Bot WhatsApp</h2>
      <p style={{
        color: status === 'conectado' ? 'green' : 'red',
        fontWeight: 'bold',
        fontSize: '18px',
        marginBottom: '20px'
      }}>
        Status: {status.charAt(0).toUpperCase() + status.slice(1)}
      </p>
      {qrImage && (
        <img
          src={qrImage}
          alt="Escanea este QR con WhatsApp para conectar el bot"
          style={{
            width: '80%',
            maxWidth: '250px',
            border: '2px solid',
            borderRadius: '4px',
            marginBottom: '20px'
          }}
        />
      )}
      {status !== 'conectado' && (
        <button
          onClick={handleStart}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'background 0.3s',
            width: '100%',
            maxWidth: '200px',
            marginBottom: '10px'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#0056b3')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#007bff')}
        >
          {loading ? 'Prendiendo...' : 'Prender Bot'}
        </button>
      )}
      <button
        onClick={handleLogout}
        disabled={loadingLogout}
        style={{
          padding: '12px 24px',
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          transition: 'background 0.3s',
          width: '100%',
          maxWidth: '200px'
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = '#c82333')}
        onMouseOut={(e) => (e.currentTarget.style.background = '#dc3545')}
      >
        {loadingLogout ? 'Logging out...' : 'Logout Bot (Force QR)'}
      </button>
      <ToastContainer autoClose={3000} hideProgressBar theme="colored" />
    </div>
  );
};

export default BotControl;