import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { ranks } from '../../utils/enums';
import { UserContext } from '../../contexts/UserContext';
import { ContextMenuProvider } from '../../contexts/ContextMenuProvider';
import Sidebar from '../Sidebar/Sidebar';
import { FaBars } from 'react-icons/fa';
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { userRank } = useContext(UserContext);

  return (
    <div className={styles.appLayout}>
      {userRank !== ranks.GUEST && <Sidebar />}

      {/* {userRank !== ranks.GUEST && (
        <FaBars className={styles.sidebarHintIcon} title="Menú lateral" aria-hidden="true" />
      )} */}

      <div className={styles.mainContent}>
        <ContextMenuProvider>
          <Outlet />
        </ContextMenuProvider>
      </div>
    </div>
  );
};

export default Layout;