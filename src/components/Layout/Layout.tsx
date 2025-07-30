import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { ranks } from '../../utils/enums';
import { UserContext } from '../../contexts/UserContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import Sidebar from '../Sidebar/Sidebar';
import { FaBars } from 'react-icons/fa';
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { userRank } = useContext(UserContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <div data-theme={theme} className={styles.appLayout}>
      {userRank !== ranks.GUEST && <Sidebar />}

      {/* {userRank !== ranks.GUEST && (
        <FaBars className={styles.sidebarHintIcon} title="Menú lateral" aria-hidden="true" />
      )} */}

      <div className={styles.mainContent}>
        <Outlet />
      </div>

      <button
        onClick={toggleTheme}
        className={styles.themeButton}
        title="Cambiar tema (claro/oscuro)"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
};

export default Layout;
