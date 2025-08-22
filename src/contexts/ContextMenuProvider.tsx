import React, { createContext, useState, useCallback, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../contexts/ThemeContext';
import styles from '../components/CustomContextMenu/CustomContextMenu.module.css';
import { FaSyncAlt, FaQuestionCircle, FaSignOutAlt, FaMoon, FaSun, FaAngleRight, FaImage } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: MenuItem[];
  hide?: boolean
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
  const [adjustedStyles, setAdjustedStyles] = useState<{ [key: number]: { top: number; bottom?: string } }>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const itemDivRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const subRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  const visibleItemsCount = items.filter(item => !item.hide).length;

  useEffect(() => {
    if (activeSub !== null) {
      const index = activeSub;
      setTimeout(() => {
        const button = itemRefs.current[index];
        const itemDiv = itemDivRefs.current[index];
        const sub = subRefs.current[index];
        if (button && itemDiv && sub && menuRef.current) {
          const paddingTop = parseFloat(window.getComputedStyle(button).paddingTop) || 8;
          const paddingBottom = parseFloat(window.getComputedStyle(menuRef.current).paddingBottom) || 8;
          const parentH = menuRef.current.offsetHeight || 0;
          const subH = sub.offsetHeight || 0;
          const buttonTop = itemDiv.offsetTop || 0;
          const subVisibleCount = items[index].children?.filter(child => !child.hide).length || 0;
          const isUpward = subVisibleCount >= visibleItemsCount;
          let calculatedTop :any;
          if (isUpward) {
            calculatedTop = parentH - buttonTop - subH + (paddingBottom * 2) + 2; // Ajuste para corregir décalage "más arriba"
          } else {
            calculatedTop = -paddingTop;
          }
          setAdjustedStyles(prev => ({ ...prev, [index]: { top: calculatedTop, bottom: 'auto' } }));
        }
      }, 0); // Espera al mount completo
    }
  }, [activeSub, items]);

  return (
    <div ref={menuRef}>
      {items.map((item, index) => (
        !item.hide && (
          <div
            key={index}
            ref={(el) => (itemDivRefs.current[index] = el)}
            style={{ position: 'relative' }}
            onMouseEnter={() => !isMobile && handleMouseEnter(index)}
            onMouseLeave={() => !isMobile && handleMouseLeave()}
          >
            <button
              ref={(el) => (itemRefs.current[index] = el)}
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
              <span>
                {item.icon && <span className={styles.menuIcon}>{item.icon}</span>}
                {item.label}
              </span>
              {item.children && <FaAngleRight />}
            </button>
            <AnimatePresence>
              {item.children && activeSub === index && (
                <motion.div
                  ref={(el) => (subRefs.current[index] = el)}
                  className={`${styles.contextMenu} ${styles.submenu} ${isSubmenu ? styles.dark : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    left: position.x + (isSubmenu ? 200 : 400) > window.innerWidth ? '-100%' : '100%',
                    ...adjustedStyles[index],
                    transformOrigin: position.x + (isSubmenu ? 200 : 400) > window.innerWidth ? 'top right' : 'top left',
                  }}
                >
                  <RenderMenuItems items={item.children} isSubmenu={true} position={position} hideMenu={hideMenu} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
    const [loggedInUserId, setLoggedInUserId] = useState<string>("");


  // Función para abrir el modal (llámalo desde tu menú de click derecho)
  const handleOpenBackgroundModal = () => {
    setIsModalOpen(true);
    setTempUrl(localStorage.getItem('backgroundUrl') || ''); // Precarga la URL actual si existe
    setPreviewError(false);
  };

  // Función para confirmar y guardar
  const handleConfirmBackground = async () => {
    if (!tempUrl || previewError) return; // Valida que sea válida

    // Guardar en localStorage para carga rápida
    localStorage.setItem('backgroundUrl', tempUrl);

    // Aplicar inmediatamente
    applyBackground(tempUrl);
    setIsModalOpen(false);
    toast.success('Fondo actualizado')
  };

  // Función para aplicar el background (usa en confirm y en load)
  const applyBackground = (url: string) => {
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundSize = 'cover'; // Mejora: Cubre toda la pantalla
    document.body.style.backgroundPosition = 'center'; // Centrado
    document.body.style.backgroundRepeat = 'no-repeat'; // No repetir
  };

  // Cargar al mounting: Primero localStorage, luego fetch from user si difiere (para sync)
  useEffect(() => {
    const storedUrl = localStorage.getItem('backgroundUrl');
    if (storedUrl) {
      applyBackground(storedUrl);
    }
  }, []);


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
        label: ' Cambiar fondo',
        icon: <FaImage/>,
        onClick: () => handleOpenBackgroundModal()
      },
      {
        label: theme === 'light' ? ' Modo oscuro' : ' Modo claro',
        icon: theme === 'light' ? <FaMoon /> : <FaSun />,
        onClick: toggleTheme,
      }
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
          const menuWidth = menuRect.width || 200;
          const menuHeight = menuRect.height || 300;
          const adjustedX = position.x + menuWidth > window.innerWidth ? position.x - menuWidth : position.x;
          const adjustedY = position.y + menuHeight > window.innerHeight ? position.y - menuHeight : position.y;
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
              transformOrigin: position.x + 200 > window.innerWidth ? 'top right' : 'top left',
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
        {isModalOpen && (
  <div className={styles.overlay}
    
  >
    <div className={styles.backgroundContainer} 
    >
      <h2>Establecer fondo personalizado</h2>
      <input 
        type="text" 
        value={tempUrl}
        onChange={(e) => {
          setTempUrl(e.target.value);
          setPreviewError(false); // Reset error al cambiar
        }}
        placeholder="Ingresa la URL de la imagen (ej: https://example.com/imagen.jpg)"
        className={styles.inputBackground}
      />
      {tempUrl && (
        <div style={{ marginBottom: '10px' }}>
          <img 
            src={tempUrl} 
            alt="Previsualización" 
            style={{ maxWidth: '200px', height: 'auto' }} // Pequeña
            onError={() => setPreviewError(true)}
          />
          {previewError && <p style={{ color: 'red' }}>URL inválida o no es una imagen.</p>}
        </div>
      )}
      <div className={styles.buttonsContainer}>
      <button 
        onClick={handleConfirmBackground} 
        disabled={!tempUrl || previewError}
        className={styles.button}
      >
        Confirmar
      </button>
      <button 
        onClick={() => setIsModalOpen(false)}
        className={styles.button}
      >
        Cancelar
      </button>
      {/* Opcional: Botón para remover fondo */}
      <button 
        onClick={() => {
          setTempUrl('');
          localStorage.removeItem('backgroundUrl');
          applyBackground(''); // O fallback a default
          // Update backend similarly
          setIsModalOpen(false);
    toast.success('Fondo eliminado')

        }}
        disabled={tempUrl ? false : true}
        className={`${styles.button} ${styles.red}`}
      >
        Eliminar
      </button>
      </div>
    </div>
  </div>
)}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
};