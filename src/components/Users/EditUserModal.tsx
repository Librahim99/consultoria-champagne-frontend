import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './EditUserModal.module.css';
import { ranks } from '../../utils/enums';

interface Props {
  user: {
    name: string;
    number?: string;
    rank: string;
  };
  onCancel: () => void;
  onSave: (data: { name: string; number: string; rank: string }) => void;
}

const EditUserModal: React.FC<Props> = ({ user, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    number: user.number || '',
    rank: user.rank,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.rank) return;
    onSave(formData);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className={styles.title}>Editar Usuario</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Usuario</label>
            <input
              id="name"
              ref={inputRef}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nombre de usuario"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="number">Número</label>
            <input
              id="number"
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              placeholder="Número de contacto"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="rank">Rango</label>
            <select
              id="rank"
              name="rank"
              value={formData.rank}
              onChange={handleChange}
              required
            >
              <option value="">Seleccione un rango</option>
              {Object.values(ranks).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.saveButton}>
              Guardar
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditUserModal;
