import React, { useContext, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ranks } from '../../utils/enums';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import { FaBars } from 'react-icons/fa'; // Asegúrate de tener este import
import styles from './Layout.module.css'; // Si no existe, crea el CSS como te pasé antes

const Layout: React.FC = () => {
  const { userRank } = useContext(UserContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  return (
    <div className={styles.appLayout}>
      {userRank !== ranks.GUEST && (
        <div className={styles.sidebarWrapper}>
          {/* @ts-ignore */}
          <FaBars className={styles.sidebarToggleIcon} onClick={toggleSidebar} title="Mostrar menú" /> {/* Fix TS, y title para tip nativo */}
          <Sidebar visible={sidebarVisible} onClose={toggleSidebar} />
        </div>
      )}
      <div className={styles.mainContent}>
        {/* <Header /> */}
        <Outlet />
      </div>
      <button onClick={toggleTheme} className={styles.themeButton} title="Cambiar tema (claro/oscuro)">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
};

export default Layout;