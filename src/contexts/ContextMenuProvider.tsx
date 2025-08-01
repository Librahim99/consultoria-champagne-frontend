import React, { createContext, useState, useCallback, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../contexts/ThemeContext';
import styles from '../components/CustomContextMenu/CustomContextMenu.module.css';
import { FaSyncAlt, FaQuestionCircle, FaSignOutAlt, FaMoon, FaSun } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface ContextMenuContextType {
  showMenu: (x: number, y: number, items: MenuItem[], rowData?: any) => void;
  hideMenu: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextType>({
  showMenu: () => {},
  hideMenu: () => {},
});

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
  }, [isOpen, hideMenu]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') hideMenu();
  }, [hideMenu]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const generalItems: MenuItem[] = [
      {
        label: 'Recargar',
        icon: <FaSyncAlt />,
        onClick: () => window.location.reload(),
      },
      {
        label: 'Ayuda',
        icon: <FaQuestionCircle />,
        onClick: () => window.open('https://wa.me/1234567890?text=Hola%2C%20necesito%20ayuda%20con%20la%20app', '_blank'),
      },
      {
        label: 'Cerrar Sesión',
        icon: <FaSignOutAlt />,
        onClick: () => {
          localStorage.removeItem('token');
          navigate('/');
        },
      },
      {
        label: theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro',
        icon: theme === 'light' ? <FaMoon /> : <FaSun />,
        onClick: toggleTheme,
      },
    ];
    showMenu(e.clientX, e.clientY, generalItems);
  }, [showMenu, navigate, theme, toggleTheme]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleClickOutside, handleKeyDown, handleContextMenu]);

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
            {menuItems.map((item, index) => (
              <button
                key={index}
                className={`${styles.menuItem} ${item.disabled ? styles.disabled : ''}`}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    hideMenu();
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!item.disabled) {
                    item.onClick();
                    hideMenu();
                  }
                }}
                disabled={item.disabled}
              >
                {item.icon && <span className={styles.menuIcon}>{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
};