import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import styles from './Header.module.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };
  return (
    <header className={styles.header}>
      <h1>Portal de Gestión</h1>
      <button onClick={handleLogout} className={styles.logout}>
        {/* @ts-ignore */}
        <FaSignOutAlt />
      </button>
    </header>
  );
};

export default Header;