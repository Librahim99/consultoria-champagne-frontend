import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import styles from '../Modal/Modal.module.css';
import Papa from 'papaparse';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCSVSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!file) {
    setError('Selecciona un archivo');
    return;
  }

  setError('');

  Papa.parse(file, {
    complete: async (result) => {
      try {
        const token = localStorage.getItem('token');
        const rows = result.data as string[][];

        // Mapear filas a objetos
        const parsedPendings = rows.map((row) => ({
          common: row[0]?.trim() || '',
          status: row[1]?.trim() || '',
          detail: row[2]?.trim() || '',
          observation: row[3]?.trim() || null,
          incident: row[4]?.trim() || null,
          username: row[5]?.trim() || '',
          assignedTo: row[6]?.trim() || null,
          date: row[7]?.trim() || new Date()
        }));
            console.log(parsedPendings)
        
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/pending/import-array`, parsedPendings);

        toast.success(response.data.message);
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al importar pendientes');
      }
    },
    error: (err) => {
      setError('Error al leer el archivo CSV');
    },
  });
};
  

  const descargarPlantilla = () => {
    const link = document.createElement('a');
    link.href = '/plantillas/plantilla_pendientes.csv';
    link.download = 'plantilla_pendientes.csv';
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseButton} onClick={onClose}>×</button>
        <h2 className={styles.modalHeader}>Importar Pendientes desde CSV</h2>
        <form className={styles.modalForm} onSubmit={handleCSVSubmit}>
          <div className="formGroup">
            <label>Selecciona un archivo CSV</label>
            <input type="file" accept=".csv" onChange={handleFileChange} required />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit">📤 Importar</button>
          <button type="button" className="secondaryBtn" onClick={descargarPlantilla}>
            📄 Descargar Plantilla
          </button>
        </form>
      </div>
    </div>
  );
};

export default ImportCSVModal;
