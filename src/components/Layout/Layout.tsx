import React, { useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ranks } from '../../utils/enums';
import { UserContext } from '../../contexts/UserContext';
import { ContextMenuProvider } from '../../contexts/ContextMenuProvider';
import Sidebar from '../Sidebar/Sidebar';
// import { FaBars } from 'react-icons/fa'; // Comentado como en el original
import styles from './Layout.module.css';

const Layout: React.FC = () => {
  const { userRank } = useContext(UserContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth > 768) return; // Solo mobile
      const target = e.target as Element;
      if (target.tagName === 'TD' || target.className?.includes('CustomTable')) return; // Priorizar scroll en tablas
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping || window.innerWidth > 768) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) { // Swipe horizontal
        if (!isSidebarOpen && deltaX > 30) { // Abrir con swipe a la derecha desde cualquier punto
          setIsSidebarOpen(true);
          isSwiping = false; // Detener tracking una vez abierto
        } else if (isSidebarOpen && deltaX < -30) { // Cerrar con swipe a la izquierda
          setIsSidebarOpen(false);
          isSwiping = false;
        }
      }
    };

    const handleTouchEnd = () => {
      isSwiping = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSidebarOpen]);

  return (
    <div className={styles.appLayout}>
      {userRank !== ranks.GUEST && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}

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