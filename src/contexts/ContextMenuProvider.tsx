import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../contexts/ThemeContext';
import styles from '../components/CustomContextMenu/CustomContextMenu.module.css';
import { FaSyncAlt, FaQuestionCircle, FaSignOutAlt, FaMoon, FaSun, FaAngleRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

interface ContextMenuContextType {
  showMenu: (x: number, y: number, items: MenuItem[], rowData?: any) => void;
  hideMenu: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextType>({
  showMenu: () => {},
  hideMenu: () => {},
});

const RenderMenuItems: React.FC<{ items: MenuItem[]; isSubmenu?: boolean; position: { x: number; y: number }; hideMenu: () => void }> = ({ items, isSubmenu, position, hideMenu }) => {
  const [activeSub, setActiveSub] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  const handleToggleSubmenu = (index: number) => {
    setActiveSub(activeSub === index ? null : index);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSub(null);
    }, 400);
  };

  const handleMouseEnter = (index: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (activeSub !== index) {
      setActiveSub(null);
      if (items[index].children) setActiveSub(index);
    }
  };

  return (
    <div ref={menuRef}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{ position: 'relative' }}
          onMouseEnter={() => !isMobile && handleMouseEnter(index)}
          onMouseLeave={() => !isMobile && handleMouseLeave()}
        >
          <button
            className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''}`}
            onClick={() => {
              if (item.children) {
                handleToggleSubmenu(index);
              } else if (item.onClick) {
                item.onClick();
                hideMenu();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (item.children) {
                handleToggleSubmenu(index);
              } else if (item.onClick) {
                item.onClick();
                hideMenu();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className={styles.menuIcon}>{item.icon}</span>}
            {item.label}
            {item.children && <FaAngleRight style={{ marginLeft: 'auto' }} />}
          </button>
          <AnimatePresence>
            {item.children && activeSub === index && (
              <motion.div
                className={`${styles.contextMenu} ${styles.submenu} ${isSubmenu ? styles.dark : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  left: position.x + (isSubmenu ? 200 : 400) > window.innerWidth ? '-100%' : '100%', // Abre a la izquierda si no hay espacio
                  top: 0,
                  transformOrigin: position.x + (isSubmenu ? 200 : 400) > window.innerWidth ? 'top right' : 'top left', // Ancla esquina según dirección
                }}
              >
                <RenderMenuItems items={item.children} isSubmenu={true} position={position} hideMenu={hideMenu} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const showMenu = useCallback((x: number, y: number, items: MenuItem[]) => {
    setPosition({ x, y });
    setMenuItems(items);
    setIsOpen(true);
  }, []);

  const hideMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (isOpen && !menuRef.current?.contains(e.target as Node)) hideMenu();
  }, [isOpen, hideMenu]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') hideMenu();
  }, [hideMenu]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const generalItems: MenuItem[] = [
      {
        label: ' Recargar',
        icon: <FaSyncAlt />,
        onClick: () => window.location.reload(),
      },
      {
        label: ' Ayuda',
        icon: <FaQuestionCircle />,
        onClick: () => window.open('https://wa.me/1234567890?text=Hola%2C%20necesito%20ayuda%20con%20la%20app', '_blank'),
      },
      {
        label: ' Cerrar Sesión',
        icon: <FaSignOutAlt />,
        onClick: () => {
          localStorage.removeItem('token');
          navigate('/');
        },
      },
      {
        label: theme === 'light' ? ' Cambiar a modo oscuro' : ' Cambiar a modo claro',
        icon: theme === 'light' ? <FaMoon /> : <FaSun />,
        onClick: toggleTheme,
      },
    ];
    showMenu(e.clientX, e.clientY, generalItems);
  }, [showMenu, navigate, theme, toggleTheme]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (isOpen) e.preventDefault();
  }, [isOpen]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isOpen) e.preventDefault();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      setTimeout(() => {
        if (menuRef.current) {
          const menuRect = menuRef.current.getBoundingClientRect();
          const menuWidth = menuRect.width || 200; // Fallback si no se mide
          const menuHeight = menuRect.height || 300; // Fallback si no se mide
          const adjustedX = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x; // Ancla esquina superior-derecha o izquierda al cursor
          const adjustedY = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y; // Ancla esquina superior o inferior al cursor
          setAdjustedPosition({ x: adjustedX, y: adjustedY });
        }
      }, 0);
    }
  }, [isOpen, position]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('wheel', handleWheel);
    document.addEventListener('touchmove', handleTouchMove);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleClickOutside, handleKeyDown, handleContextMenu, handleWheel, handleTouchMove]);

  return (
    <ContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`${styles.contextMenu} ${theme === 'dark' ? styles.dark : ''}`}
            style={{
              position: 'fixed',
              left: adjustedPosition.x,
              top: adjustedPosition.y,
              transformOrigin: position.x + 200 > window.innerWidth ? 'top right' : 'top left', // Ancla esquina según dirección
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            ref={menuRef}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <RenderMenuItems items={menuItems} isSubmenu={false} position={adjustedPosition} hideMenu={hideMenu} />
          </motion.div>
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
};