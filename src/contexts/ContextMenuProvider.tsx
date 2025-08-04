import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../contexts/ThemeContext';
import { FaSyncAlt, FaQuestionCircle, FaSignOutAlt, FaMoon, FaSun, FaAngleRight } from 'react-icons/fa'; // Agregado FaAngleRight para indicador de submenu
import { useNavigate } from 'react-router-dom';
import styles from '../components/CustomContextMenu/CustomContextMenu.module.css';

interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: MenuItem[]; // Agregado para submenús
}

interface ContextMenuContextType {
  showMenu: (x: number, y: number, items: MenuItem[], rowData?: any) => void;
  hideMenu: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextType>({
  showMenu: () => {},
  hideMenu: () => {},
});

const RenderMenuItems: React.FC<{ items: MenuItem[]; isSubmenu?: boolean }> = ({ items, isSubmenu }) => {
  const [activeSub, setActiveSub] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveSub(null);
    }, 200); // Delay de 200ms para tolerar movimientos rápidos
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <div ref={menuRef} onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter}>
      {items.map((item, index) => (
        <div key={index} style={{ position: 'relative' }}>
          <button
            className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''}`}
            onClick={item.children ? undefined : item.onClick}
            disabled={item.disabled}
            onMouseEnter={() => {
              handleMouseEnter();
              if (item.children) setActiveSub(index);
            }}
            onMouseLeave={handleMouseLeave}
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
                style={{ position: 'absolute', left: '100%', top: 0 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <RenderMenuItems items={item.children} isSubmenu={true} />
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
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const showMenu = useCallback((x: number, y: number, items: MenuItem[]) => {
    setPosition({ x, y });
    setMenuItems(items);
    setIsOpen(true);
  }, []);

  const hideMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (isOpen) hideMenu();
  }, [isOpen]);

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
            style={{ top: position.y, left: position.x, position: 'fixed' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <RenderMenuItems items={menuItems} />
          </motion.div>
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
};