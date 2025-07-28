import React from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaBuilding, FaClock, FaTasks, FaHeadset, FaExclamationTriangle, FaRobot } from 'react-icons/fa';
import styles from './Sidebar.module.css';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ visible, onClose }) => {
  return (
    <div className={`${styles.sidebar} ${visible ? styles.visible : ''}`}>
      <ul>
        <li><Link to="/dashboard" onClick={onClose}>
          {/* @ts-ignore */}
          <FaClock />  Dashboard
        </Link></li>
        <li><Link to="/users" onClick={onClose}>
          {/* @ts-ignore */}
          <FaUsers />  Usuarios
        </Link></li>
        <li><Link to="/clients" onClick={onClose}>
          {/* @ts-ignore */}
          <FaBuilding />  Clientes
        </Link></li>
        <li><Link to="/incidents" onClick={onClose}>
          {/* @ts-ignore */}
          <FaExclamationTriangle />  Incidencias
        </Link></li>
        <li><Link to="/pending-tasks" onClick={onClose}>
          {/* @ts-ignore */}
          <FaTasks />  Pendientes
        </Link></li>
        <li><Link to="/assistances" onClick={onClose}>
          {/* @ts-ignore */}
          <FaHeadset />  Asistencias
        </Link></li>
        <li><Link to="/admin/bot" onClick={onClose}>
          {/* @ts-ignore */}
          <FaRobot />  Admin Bot
        </Link></li>
      </ul>
    </div>
  );
};

export default Sidebar;