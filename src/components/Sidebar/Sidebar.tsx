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

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);

  return (
    <div
      className={`${styles.sidebar} ${isOpen ? styles.visible : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ul>
        <li><Link to="/dashboard"><FaClock /> Dashboard</Link></li>
        {userRank === ranks.TOTALACCESS && (<li><Link to="/users"><FaUsers /> Usuarios</Link></li>)}
        <li><Link to="/clients"><FaBuilding /> Clientes</Link></li>
        {userRank === ranks.TOTALACCESS &&(<li><Link to="/incidents"><FaExclamationTriangle /> Incidencias</Link></li>)}
        <li><Link to="/pending-tasks"><FaTasks /> Pendientes</Link></li>
        <li><Link to="/assistances"><FaHeadset /> Asistencias</Link></li>
        {userRank === ranks.TOTALACCESS &&(<li><Link to="/admin/bot"><FaRobot /> Admin Bot</Link></li>)}
      </ul>
      {/* Nueva solapa indicadora */}
      <div className={styles.sidebarHintContainer} onMouseEnter={handleMouseEnter} title="Abrir menú lateral">
      </div>
      <FaBars className={styles.sidebarHint}  />
    </div>
  );
};

export default Sidebar;