import React from 'react';
import { FaBuilding, FaClock, FaTasks, FaBars } from 'react-icons/fa';
import styles from './Sidebar.module.css';
import { NavLink, Link } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 768;

  return (
    <div
      className={`${styles.sidebar} ${isOpen ? styles.visible : ''}`}
      onMouseEnter={isDesktop ? () => setIsOpen(true) : undefined}
      onMouseLeave={isDesktop ? () => setIsOpen(false) : undefined}
    >
      <ul>

        <li>
          <Link
            to="/clients"
            onClick={!isDesktop ? () => setIsOpen(false) : undefined}
          >
            <FaBuilding /> Clientes
          </Link>
        </li>

        <li>
          <Link
            to="/pending-tasks"
            onClick={!isDesktop ? () => setIsOpen(false) : undefined}
          >
            <FaTasks /> Pendientes
          </Link>
        </li>
      </ul>

      {/* Indicador / solapa */}
      <div
        className={styles.sidebarHintContainer}
        onMouseEnter={isDesktop ? () => setIsOpen(true) : undefined}
        title="Abrir menú lateral"
      />
      <FaBars className={styles.sidebarHint} />
    </div>
  );
};

export default Sidebar;