import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUsers,
  FaBuilding,
  FaClock,
  FaTasks,
  FaHeadset,
  FaExclamationTriangle,
  FaRobot,
  FaBars // Nueva import para la solapa
} from 'react-icons/fa';
import styles from './Sidebar.module.css';
import { UserContext } from '../../contexts/UserContext';
import { ranks } from '../../utils/enums';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { userRank, userId } = useContext(UserContext);

  return (
    <div
      className={`${styles.sidebar} ${isOpen ? styles.visible : ''}`}
      onMouseEnter={window.innerWidth > 768 ? () => setIsOpen(true) : undefined}
      onMouseLeave={window.innerWidth > 768 ? () => setIsOpen(false) : undefined}
    >
      <ul>
        <li><Link to="/dashboard" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaClock /> Dashboard</Link></li>
        {userRank === ranks.TOTALACCESS && (<li><Link to="/users" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaUsers /> Usuarios</Link></li>)}
        <li><Link to="/clients" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaBuilding /> Clientes</Link></li>
        {userRank === ranks.TOTALACCESS &&(<li><Link to="/incidents" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaExclamationTriangle /> Incidencias</Link></li>)}
        <li><Link to="/pending-tasks" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaTasks /> Pendientes</Link></li>
        <li><Link to="/assistances" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaHeadset /> Asistencias</Link></li>
        {userRank === ranks.TOTALACCESS &&(<li><Link to="/admin/bot" onClick={window.innerWidth <= 768 ? () => setIsOpen(false) : undefined}><FaRobot /> Admin Bot</Link></li>)}
      </ul>
      {/* Nueva solapa indicadora */}
      <div className={styles.sidebarHintContainer} onMouseEnter={window.innerWidth > 768 ? () => setIsOpen(true) : undefined} title="Abrir menú lateral">
      </div>
      <FaBars className={styles.sidebarHint} />
    </div>
  );
};

export default Sidebar;