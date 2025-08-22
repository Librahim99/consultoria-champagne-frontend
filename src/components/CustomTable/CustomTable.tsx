import React, { useState, useMemo, useCallback, useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { FaSortUp, FaSortDown, FaSort, FaCog, FaUndo, FaFilter, FaSync, FaTrello, FaThList, FaCompress, FaExpand } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './CustomTable.module.css';
import { useContextMenu } from '../../contexts/UseContextMenu';
import { ranks } from '../../utils/enums';

interface Column {
  field: string;
  headerName: string;
  sortable?: boolean;
  filterable?: boolean;
  valueFormatter?: (value: any) => string;
  cellRenderer?: (data: any) => React.ReactNode;
  width?: string;
  hiddenByDefault?: boolean;
}

interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: MenuItem[];
}

interface CustomTableProps {
  rowData: any[];
  columnDefs: Column[];
  pagination?: boolean;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  searchable?: boolean;
  className?: string;
  customizable?: boolean;
  storageKey?: string;
  onRefresh?: () => void;
  onRowContextMenu?: (rowData: any) => MenuItem[];
  enableUserFilter?: boolean;
enableDateFilter?: boolean;
enableStatusFilter?: boolean;
onFilterChange?: (filterType: 'user' | 'date' | 'status', value: string) => void;
enableKanbanView?: boolean;
  kanbanStatuses?: KanbanStatus[];
  onStatusChange?: (id: string, newStatus: string, table: boolean) => void;
  onRowClick?: (row: any) => void;
  loggedInUserId?: string
  userPictures?: UserPicture[]
  userRank?: string
}

interface UserPicture {
  userId: string;
  picture: string
}

interface KanbanStatus {
  key: string;
  label: string;
}

const CustomTable: React.FC<CustomTableProps> = ({
  rowData,
  columnDefs,
  pagination = true,
  pageSizeOptions = [15, 50, 100],
  defaultPageSize = 15,
  searchable = true,
  className = '',
  customizable = false,
  storageKey = 'defaultTable',
  onRefresh,
  onRowContextMenu,
  enableUserFilter,
  enableDateFilter,
  enableStatusFilter,
  onFilterChange,
  enableKanbanView,
  kanbanStatuses,
  onStatusChange,
  onRowClick,
  loggedInUserId,
  userPictures,
  userRank
}) => {
  const { showMenu } = useContextMenu();
  const { theme } = useContext(ThemeContext);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: string }>({});
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showFilter, setShowFilter] = useState<{ [key: string]: boolean }>({});
  const isInitialLoad = useRef(true);
  const hasUserChangedConfig = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const resizeRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);
  const [userFilter, setUserFilter] = useState('me');
const [dateFilter, setDateFilter] = useState('month');
const [statusFilter, setStatusFilter] = useState('pending_inprogress');
const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
const [allExpanded, setAllExpanded] = useState(false);
const [amount, setAmount] = useState<number>(rowData.length);




const toggleAllCards = () => {
  if (allExpanded) {
    setExpandedCards(new Set()); // Contrae todas
  } else {
    const allIds = new Set(rowData.map(row => row._id)); // Expande todas basadas en datos filtrados
    setExpandedCards(allIds);
  }
  setAllExpanded(!allExpanded); // Toggle estado
};
  const getDefaultColumns = useCallback(() => ({
    visible: columnDefs.filter(col => !col.hiddenByDefault).map(col => col.field),
    order: columnDefs.map(col => col.field),
    widths: columnDefs.reduce((acc, col) => {
      acc[col.field] = col.width || '150px';
      return acc;
    }, {} as { [key: string]: string }),
  }), [columnDefs]);

  const handleRowContextMenu = (e: React.MouseEvent, row: any) => {
    if (onRowContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      const items = onRowContextMenu(row);
      showMenu(e.clientX, e.clientY, items);
    }
  };

  const isValidConfig = (config: { visible: string[]; order: string[]; widths: { [key: string]: string } }) => {
    const validFields = columnDefs.map(col => col.field);
    return (
      Array.isArray(config.visible) &&
      Array.isArray(config.order) &&
      config.visible.every(field => validFields.includes(field)) &&
      config.order.every(field => validFields.includes(field)) &&
      Object.keys(config.widths).every(field => validFields.includes(field))
    );
  };

  useEffect(() => {
    if (customizable) {
      const key = `customTable_${storageKey}`;
      try {
        const savedConfig = localStorage.getItem(key);
        const defaults = getDefaultColumns();
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          if (isValidConfig(parsed)) {
            setVisibleColumns(parsed.visible);
            setColumnOrder(parsed.order);
            setColumnWidths(parsed.widths);
          } else {
            console.warn(`Configuración inválida en ${key}, usando defaults`);
            setVisibleColumns(defaults.visible);
            setColumnOrder(defaults.order);
            setColumnWidths(defaults.widths);
            localStorage.setItem(key, JSON.stringify(defaults));
          }
        } else {
          setVisibleColumns(defaults.visible);
          setColumnOrder(defaults.order);
          setColumnWidths(defaults.widths);
          localStorage.setItem(key, JSON.stringify(defaults));
        }
      } catch (err) {
        console.error(`Error cargando config de ${key}:`, err);
        const defaults = getDefaultColumns();
        setVisibleColumns(defaults.visible);
        setColumnOrder(defaults.order);
        setColumnWidths(defaults.widths);
        localStorage.setItem(key, JSON.stringify(defaults));
      }
    } else {
      const defaults = getDefaultColumns();
      setVisibleColumns(defaults.visible);
      setColumnOrder(defaults.order);
      setColumnWidths(defaults.widths);
    }
    isInitialLoad.current = false;
  }, [customizable, storageKey, getDefaultColumns]);

  useEffect(() => {
  if (enableKanbanView) {
    const viewModeKey = `viewMode_${storageKey}`;
    const savedViewMode = localStorage.getItem(viewModeKey) as 'table' | 'kanban' | null;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }
}, [enableKanbanView, storageKey]);

  const saveConfig = useCallback(() => {
    if (customizable && !isInitialLoad.current && hasUserChangedConfig.current) {
      const key = `customTable_${storageKey}`;
      const config = { visible: visibleColumns, order: columnOrder, widths: columnWidths };
      if (isValidConfig(config)) {
        try {
          localStorage.setItem(key, JSON.stringify(config));
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          toastTimeoutRef.current = setTimeout(() => {
          }, 1000);
        } catch (err) {
          console.error(`Error guardando config en ${key}:`, err);
        }
      } else {
        console.warn(`No se guardó config en ${key}: configuración inválida`, config);
      }
    }
  }, [customizable, storageKey, visibleColumns, columnOrder, columnWidths]);

  useEffect(() => {
    if (!isInitialLoad.current && hasUserChangedConfig.current) {
      saveConfig();
    }
  }, [visibleColumns, columnOrder, columnWidths, saveConfig]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const getPriorityClass = (priority: number) => {
  switch (priority) {
    case 1: return styles.priority1;  // Rojo
    case 2: return styles.priority2;  // Naranja
    case 3: return styles.priority3;  // Amarillo
    case 4: return styles.priority4;  // Gris
    case 5: return styles.priority5;  // Neutro
    default: return '';
  }
};

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !Object.values(filterRefs.current).some(ref => ref && ref.contains(target)) &&
        !(target instanceof Element && target.closest(`.${styles.configMenu}`))
      ) {
        setShowFilter({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const processedColumns = useMemo(() => {


    
    return columnOrder
      .filter(field => visibleColumns.includes(field))
      .map(field => columnDefs.find(col => col.field === field)!)
      .filter(col => col);
  }, [columnOrder, visibleColumns, columnDefs]);

  const processedData = useMemo(() => {
    let data = [...rowData];

data.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;  // Asc por priority
    if (sortConfig) {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      return (a[sortConfig.key] > b[sortConfig.key] ? direction : -direction);
    }
    return 0;
  });

    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      data = data.filter((row) =>
        processedColumns.some((col) => {
          const val = col.valueFormatter ? col.valueFormatter(row[col.field] || '') : row[col.field] ?? '';
          return String(val).toLowerCase().includes(searchLower);
        })
      );
    }

    Object.entries(filters).forEach(([key, value]) => {

 

      if (value) {
        const lowerValue = value.toLowerCase();
        const col = columnDefs.find(c => c.field === key);
        data = data.filter((row) => {
          const val = col?.valueFormatter ? col.valueFormatter(row[key] || '') : row[key] ?? '';
          return String(val).toLowerCase().includes(lowerValue);
        });
      }
    });

    

    if (sortConfig) {
      data.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

   
    setAmount(data.length)
    return data;

  }, [rowData, globalSearch, filters, sortConfig, columnDefs, processedColumns]);

  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, filters, pageSize]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = () => {
    setFilters({});
    setGlobalSearch('');
    setShowFilter({});
    setSortConfig(null);
    setCurrentPage(1);
    if (onRefresh) {
      onRefresh();
    }
    toast.info('Filtros, búsqueda y orden reseteados', { autoClose: 1000 });
  };

  const requestSort = useCallback((key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <FaSort />;
    return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const toggleFilter = (field: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFilter((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, field: string) => {
    e.dataTransfer.setData('text/plain', field);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, targetField: string) => {
    const draggedField = e.dataTransfer.getData('text/plain');
    if (draggedField === targetField) return;
    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedField);
    const targetIndex = newOrder.indexOf(targetField);
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedField);
    setColumnOrder(newOrder);
    hasUserChangedConfig.current = true;
  };

  const toggleColumnVisibility = (field: string) => {
    setVisibleColumns(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
    hasUserChangedConfig.current = true;
  };

  const updateColumnWidth = (field: string, width: string) => {
    setColumnWidths(prev => ({ ...prev, [field]: width }));
    hasUserChangedConfig.current = true;
  };

  const resetConfig = () => {
    const defaults = getDefaultColumns();
    setVisibleColumns(defaults.visible);
    setColumnOrder(defaults.order);
    const newWidths: { [key: string]: string } = {};
    columnDefs.forEach(col => {
      newWidths[col.field] = '150px';
    });
    setColumnWidths(newWidths);
    hasUserChangedConfig.current = true;
    const key = `customTable_${storageKey}`;
    localStorage.setItem(key, JSON.stringify({ visible: defaults.visible, order: defaults.order, widths: newWidths }));
    toast.info('Configuración de tabla reseteada a defaults', { autoClose: 1000 });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = e.currentTarget.closest('th');
    if (!th) return;
    const startWidth = parseFloat(columnWidths[field] || '150') || th.offsetWidth;
    const startX = e.clientX;
    resizeRef.current = { field, startX, startWidth };

    const handleMouseMove = (moveE: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = moveE.clientX - resizeRef.current.startX;
      const newWidth = Math.max(100, resizeRef.current.startWidth + delta);
      updateColumnWidth(resizeRef.current.field, `${newWidth}px`);
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleGeneralFilterChange = useCallback((type: 'user' | 'date' | 'status', value: string) => {
  if (type === 'user') setUserFilter(value);
  if (type === 'date') setDateFilter(value);
  if (type === 'status') setStatusFilter(value);
  onFilterChange?.(type, value);
}, [onFilterChange]);

const toggleViewMode = () => {
  const newMode = viewMode === 'table' ? 'kanban' : 'table';
  setViewMode(newMode);
  const viewModeKey = `viewMode_${storageKey}`;
  localStorage.setItem(viewModeKey, newMode);
};

const getTableContextMenu = (e: React.MouseEvent) => {
  e.preventDefault();
  const items: MenuItem[] = [];
  if (enableKanbanView) {
    items.push({
      label: `Cambiar a Vista ${viewMode === 'table' ? 'Kanban' : 'Tabla'}`,
      onClick: toggleViewMode,
    });
  }
  showMenu(e.clientX, e.clientY, items);
};


// Kanban view logic
const groupedData = useMemo(() => {
  if (viewMode !== 'kanban') return {};
  const groups: { [key: string]: any[] } = {};
  kanbanStatuses.forEach(status => {
    groups[status.key] = [];
  });
  processedData.forEach(item => {
    const statusKey = item.status; // Asumiendo que status es la clave del enum
    if (groups[statusKey]) {
      groups[statusKey].push(item);
    }
  });
  return groups;
}, [viewMode, processedData, kanbanStatuses, rowData]);

const handleDragStart = (e: React.DragEvent, row: any) => {
  if ((loggedInUserId && row.userId !== loggedInUserId && row.assignedUserId !== loggedInUserId) && userRank !== ranks.TOTALACCESS) {
    e.preventDefault(); // No permite arrastrar si no es owner
    return;
  }
  e.dataTransfer.setData('pendingId', row._id);
  e.dataTransfer.setData('originalStatus', row.status); // Almacena status original para check en drop
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
};

const handleDrop = (e: React.DragEvent, newStatus: string) => {
  e.preventDefault();
  const id = e.dataTransfer.getData('pendingId');
  const originalStatus = e.dataTransfer.getData('originalStatus');
  if (originalStatus === newStatus) {
    return; // No hace nada si suelta en misma columna
  }
  if (onStatusChange) {
    onStatusChange(id, newStatus, false);
  }
};

const handleCardClick = (e: React.MouseEvent, row: any) => {
  if (e.shiftKey) {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(row._id)) {
        newSet.delete(row._id);
      } else {
        newSet.add(row._id);
      }
      return newSet;
    });
  } else {
    onRowClick(row)
  }
};

const getUserPicture = (userid: string) => {
  const userPicture = userPictures.find((a) => a.userId === userid)
  return userPicture ? userPicture.picture : null
}

const debouncedSearch = useRef<NodeJS.Timeout | null>(null);

const handleGlobalSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  if (debouncedSearch.current) {
    clearTimeout(debouncedSearch.current);
  }
  debouncedSearch.current = setTimeout(() => {
    setGlobalSearch(value);
    setCurrentPage(1);
  },1); // Debounce 300ms para evitar re-renders innecesarios durante typing
};

const getFormatter = (field: string) => columnDefs.find(col => col.field === field)?.valueFormatter;

const renderKanbanView = () => (
  <div className={styles.kanbanContainer}>
    {kanbanStatuses.map(status => {
      const items = groupedData[status.key] || [];
      const isEmpty = items.length === 0;
      return (
        <div
          key={status.key}
          className={`${styles.kanbanColumn} ${isEmpty ? styles.emptyColumn : ''}`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status.key)}
        >
          <div className={styles.kanbanColumnHeader}>{status.label} ({items.length})</div>
          <div className={styles.kanbanColumnBody}>
            {items.map(row => {
  const isExpanded = expandedCards.has(row._id);
  const clientFormatter = getFormatter('clientId');
  const detailFormatter = getFormatter('detail');
  const userPicture = getUserPicture(row.userId)
  const assignedPicture = getUserPicture(row.assignedUserId)
  const clientName = clientFormatter ? clientFormatter(row.clientId) : row.clientId;
  const detail = detailFormatter ? detailFormatter(row.detail) : row.detail;
  const observation = row.observation || ''; // Asumiendo field 'observation' en row
  const titleTextClient = clientName.split(' ').slice(1).join(' ')
  const titleTextDetail = detail
  const truncatedTitleClient = titleTextClient.length > 19 ? `${titleTextClient.substring(0, 19)}` : titleTextClient;
  const truncatedTitleDetail = titleTextDetail;
  return (
    <div
      key={row._id}
      className={`${styles.kanbanCard} ${isExpanded ? styles.expandedCard : ''}`}
      draggable={loggedInUserId && (row.userId === loggedInUserId || row.assignedUserId === loggedInUserId ) || userRank === ranks.TOTALACCESS}
      onDragStart={(e) => handleDragStart(e, row)}
      onClick={(e) => handleCardClick(e, row)}
    >
      <div className={`${styles.cardTitle} ${getPriorityClass(row.priority)}`}>
        <div className={styles.cardTitleText}>
          <div className={styles.titleTextClientAndPicture}>
            <div className={styles.titleTextClient}>
        <span>
          {truncatedTitleClient}</span>
            </div>
        <div className={styles.userPictureContainer}>
        <img className={styles.userPicture} src={userPicture} alt="user" />
        {assignedPicture && (<img className={styles.assignedPicture} src={assignedPicture} alt="user" />)}
        </div>
          </div>
        {truncatedTitleDetail}
        
        </div>
        
      </div>
      {isExpanded && (
        <div className={styles.cardDetail}>
          <p>{detail}</p>
          {observation && <p>Observación: {observation}</p>}
        </div>
      )}
    </div>
  );
})}
          </div>
        </div>
      );
    })}
  </div>
);

  const renderConfigMenu = () => (
    <div className={styles.configMenu}>
      <h3>Personalizar Columnas</h3>
      {columnDefs.map(col => (
        <div key={col.field} className={styles.configItem}>
          <input
            type="checkbox"
            checked={visibleColumns.includes(col.field)}
            onChange={() => toggleColumnVisibility(col.field)}
          />
          <span>{col.headerName}</span>
          <input
            type="number"
            value={parseInt(columnWidths[col.field] || '150')}
            onChange={(e) => updateColumnWidth(col.field, `${e.target.value}px`)}
            style={{ width: '60px', marginLeft: 'auto' }}
            min={40}
            title="Ancho en px"
          />
        </div>
      ))}
      {/* <p>Ordená ↑↓ clickeando en el nombre de la columna, arrastra para moverla, estirá desde el borde para ajustar el ancho.</p> */}
      <button onClick={resetConfig} className={styles.configMenuButton}>
        <FaUndo /> Resetear (anchos a 150px)
      </button>
      <button onClick={() => setShowConfigMenu(false)} className={styles.configMenuButton}>
        Cerrar
      </button>
    </div>
  );

  return (
    <div onContextMenu={(e) => getTableContextMenu(e)} className={`${styles.tableContainer}  ${theme === 'dark' ? styles.dark : styles.light} ${className}`}>
      <div className={styles.controls}>
        <div className={styles.filtersContainer}> 
        {searchable && (
          <input
            type="text"
            placeholder="Buscar en la tabla..."
            value={globalSearch}
            onChange={(e) => handleGlobalSearch(e)}
            className={styles.searchInput}
          />
        )}
        {enableUserFilter && (
  <select value={userFilter} onChange={(e) => handleGeneralFilterChange('user', e.target.value)} className={styles.filterSelect}>
    <option value="me">Solo yo</option>
    <option value="all">Todos</option>
  </select>
)}
{enableDateFilter && (
  <select value={dateFilter} onChange={(e) => handleGeneralFilterChange('date', e.target.value)} className={styles.filterSelect}>
    <option value="week">Esta semana</option>
    <option value="month">Este mes</option>
    <option value="all">Todos</option>
  </select>
)}
{enableStatusFilter && (
  <select value={statusFilter} onChange={(e) => handleGeneralFilterChange('status', e.target.value)} className={styles.filterSelect}>
    <option value="pending_inprogress">Pendiente/En Proceso</option>
    <option value="tobudget_budgeted">Presupuestar/Presupuestado</option>
    <option value="test_revision">Prueba/Revisión</option>
    <option value="solved_cancelled">Resuelto/Cancelado</option>
    <option value="all">Todos</option>
  </select>
)}
 
        </div>
        <div className={styles.buttonsContainer}>
          {customizable && viewMode === 'table' && (
            <button className={styles.configButton} onClick={() => setShowConfigMenu(!showConfigMenu)}>
              <FaCog />
            </button>
          )}
          {viewMode === 'kanban' && (
    <button
      className={styles.refreshButton} // Reutiliza estilo para consistencia
      onClick={toggleAllCards}
    >
      {allExpanded ? <FaCompress /> : <FaExpand />}
    </button>
  )}
          {enableKanbanView && <button onClick={() => toggleViewMode()} className={styles.refreshButton}>
            {viewMode === 'table' ?  <FaTrello/> : <FaThList/>}
          </button>}
          <button
            className={styles.refreshButton}
            onClick={resetFilters}
            title="Refrescar y resetear filtros"
          >
            <FaSync />
          </button>
        </div>
      </div>
      {showConfigMenu && renderConfigMenu()}
      <div className={`${styles.tableWrapper} ${viewMode === 'kanban' ? styles.kanbanMode : ''}`}>
        {viewMode === 'table' ? (
        <table className={styles.table}>
          <thead>
            <tr>
              {processedColumns.map((col) => (
                <th
                  key={col.field}
                  style={{
                    width: columnWidths[col.field] || '150px',
                    minWidth: '40px',
                    maxWidth: columnWidths[col.field] || '150px', // Forzar máximo al ancho definido
                  }}
                  title={col.headerName}
                >
                  <div className={styles.headerContent}>
                    <span className={styles.headerText}>
                      {customizable && (
                        <div
                          className={styles.dragHandle}
                          draggable={true}
                          onDragStart={(e) => onDragStart(e, col.field)}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, col.field)}
                          title="Arrastrar para reordenar"
                        >
                          {col.headerName}
                        </div>
                      )}
                      {col.sortable && (
                        <button
                          className={styles.sortButton}
                          onClick={() => requestSort(col.field)}
                          title="Ordenar"
                        >
                          {getSortIcon(col.field)}
                        </button>
                      )}
                    </span>
                    {col.filterable && (
                      <button
                        className={styles.filterToggle}
                        onClick={(e) => toggleFilter(col.field, e)}
                        title="Filtrar"
                      >
                        <FaFilter />
                      </button>
                    )}
                    {col.filterable && showFilter[col.field] && (
                      <div className={styles.filterWrapper} ref={(el) => (filterRefs.current[col.field] = el)}>
                        <input
                          type="text"
                          placeholder="Filtrar"
                          value={filters[col.field] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleFilterChange(col.field, e.target.value)}
                          className={styles.headerFilterInput}
                        />
                      </div>
                    )}
                  </div>
                  {customizable && (
                    <div
                      className={styles.resizeHandle}
                      onMouseDown={(e) => handleResizeMouseDown(e, col.field)}
                      title="Arrastra para cambiar ancho"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr key={index} onContextMenu={(e) => handleRowContextMenu(e, row)}>
                  {processedColumns.map((col) => {
                    const cellValue = col.cellRenderer
                      ? col.cellRenderer(row)
                      : col.valueFormatter
                      ? col.valueFormatter(row[col.field] || '')
                      : row[col.field] ?? '';
                    const displayValue = String(cellValue);
                    return (
                      <td
                        key={`${index}-${col.field}`}
                        title={displayValue}
                        style={{
                          width: columnWidths[col.field] || '150px',
                          minWidth: '40px',
                          maxWidth: columnWidths[col.field] || '150px', // Forzar máximo al ancho definido
                        }}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={processedColumns.length} className={styles.noData}>
                  No hay datos disponibles según los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
        ): (
  renderKanbanView()
)}
      </div>
      {viewMode === 'table' && pagination  && totalPages > 0 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            Primera
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages} | Total: {amount} líneas
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            Siguiente
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            Última
          </button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className={styles.pageSizeSelect}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} por página
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default CustomTable;
