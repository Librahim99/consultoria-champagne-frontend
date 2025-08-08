import React, { useEffect } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Limpiar al cerrar
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer click dentro del modal
      >
        <button className={styles.modalCloseButton} onClick={onClose}>×</button>
        {title && <h2 className={styles.modalHeader}>{title}</h2>}
        <div className={styles.modalForm}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
