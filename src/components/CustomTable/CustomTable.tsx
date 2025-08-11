import React, { useState, useMemo, useCallback, useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { FaSortUp, FaSortDown, FaSort, FaCog, FaUndo, FaFilter, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './CustomTable.module.css';
import { useContextMenu } from '../../contexts/UseContextMenu';

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
  onFilterChange
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
const [dateFilter, setDateFilter] = useState('week');
const [statusFilter, setStatusFilter] = useState('pending_inprogress');

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
            min={100}
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
    <div className={`${styles.tableContainer} ${theme === 'dark' ? styles.dark : styles.light} ${className}`}>
      <div className={styles.controls}>
        <div className={styles.filtersContainer}> 
        {searchable && (
          <input
            type="text"
            placeholder="Buscar en la tabla..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
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
          <button
            className={styles.refreshButton}
            onClick={resetFilters}
            title="Refrescar y resetear filtros"
          >
            <FaSync />
          </button>
          {customizable && (
            <button className={styles.configButton} onClick={() => setShowConfigMenu(!showConfigMenu)}>
              <FaCog /> Personalizar
            </button>
          )}
        </div>
      </div>
      {showConfigMenu && renderConfigMenu()}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {processedColumns.map((col) => (
                <th
                  key={col.field}
                  style={{
                    width: columnWidths[col.field] || '150px',
                    minWidth: '100px',
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
                          minWidth: '100px',
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
      </div>
      {pagination && totalPages > 0 && (
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
            Página {currentPage} de {totalPages} | Total: {rowData.length} líneas
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
