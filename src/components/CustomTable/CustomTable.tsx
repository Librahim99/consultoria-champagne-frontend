import React, { useState, useMemo, useCallback, useContext, useEffect, useRef } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { FaSortUp, FaSortDown, FaSort, FaCog, FaUndo, FaFilter, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './CustomTable.module.css';

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
  onRefresh?: () => void; // Prop opcional para re-fetch
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
}) => {
  const { theme } = useContext(ThemeContext);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [showFilter, setShowFilter] = useState<{ [key: string]: boolean }>({});
  const isInitialLoad = useRef(true);
  const hasUserChangedConfig = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({}); // Refs para inputs de filtro

  const getDefaultColumns = useCallback(() => ({
    visible: columnDefs.filter(col => !col.hiddenByDefault).map(col => col.field),
    order: columnDefs.map(col => col.field),
  }), [columnDefs]);

  const isValidConfig = (config: { visible: string[]; order: string[] }) => {
    const validFields = columnDefs.map(col => col.field);
    return (
      Array.isArray(config.visible) &&
      Array.isArray(config.order) &&
      config.visible.length > 0 &&
      config.order.length > 0 &&
      config.visible.every(field => validFields.includes(field)) &&
      config.order.every(field => validFields.includes(field))
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
          console.log(`Cargando config de ${key}:`, parsed);
          if (isValidConfig(parsed)) {
            setVisibleColumns(parsed.visible);
            setColumnOrder(parsed.order);
          } else {
            console.warn(`Configuración inválida en ${key}, usando defaults`);
            setVisibleColumns(defaults.visible);
            setColumnOrder(defaults.order);
            localStorage.setItem(key, JSON.stringify(defaults));
          }
        } else {
          console.log(`No hay config en ${key}, inicializando con defaults`);
          setVisibleColumns(defaults.visible);
          setColumnOrder(defaults.order);
          localStorage.setItem(key, JSON.stringify(defaults));
        }
      } catch (err) {
        console.error(`Error cargando config de ${key}:`, err);
        toast.error('Error al cargar la configuración de la tabla');
        const defaults = getDefaultColumns();
        setVisibleColumns(defaults.visible);
        setColumnOrder(defaults.order);
        localStorage.setItem(key, JSON.stringify(defaults));
      }
    } else {
      const defaults = getDefaultColumns();
      setVisibleColumns(defaults.visible);
      setColumnOrder(defaults.order);
    }
    isInitialLoad.current = false;
  }, [customizable, storageKey, getDefaultColumns]);

  const saveConfig = useCallback(() => {
    if (customizable && !isInitialLoad.current && hasUserChangedConfig.current) {
      const key = `customTable_${storageKey}`;
      const config = { visible: visibleColumns, order: columnOrder };
      if (isValidConfig(config)) {
        try {
          localStorage.setItem(key, JSON.stringify(config));
          console.log(`Guardando config en ${key}:`, config);
          if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
          }
          toastTimeoutRef.current = setTimeout(() => {
            toast.success('Configuración de tabla guardada', { autoClose: 2000 });
          }, 1000);
        } catch (err) {
          console.error(`Error guardando config en ${key}:`, err);
          toast.error('Error al guardar la configuración');
        }
      } else {
        console.warn(`No se guardó config en ${key}: configuración inválida`, config);
      }
    }
  }, [customizable, storageKey, visibleColumns, columnOrder]);

  useEffect(() => {
    if (!isInitialLoad.current && hasUserChangedConfig.current) {
      saveConfig();
    }
  }, [visibleColumns, columnOrder, saveConfig]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Cierre de inputs al clic fuera
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
    setSortConfig(null); // Resetear ordenamiento
    setCurrentPage(1); // Volver a la primera página
    if (onRefresh) {
      onRefresh(); // Llama al fetch del componente padre si existe
    }
    toast.info('Filtros, búsqueda y orden reseteados', { autoClose: 2000 });
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

  const onDragStart = (e: React.DragEvent<HTMLTableCellElement>, field: string) => {
    e.dataTransfer.setData('text/plain', field);
  };

  const onDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLTableCellElement>, targetField: string) => {
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

  const resetConfig = () => {
    const defaults = getDefaultColumns();
    setVisibleColumns(defaults.visible);
    setColumnOrder(defaults.order);
    hasUserChangedConfig.current = true;
    const key = `customTable_${storageKey}`;
    localStorage.removeItem(key);
    toast.info('Configuración de tabla reseteada', { autoClose: 2000 });
  };

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
        </div>
      ))}
      <p>Arrastra las columnas en la tabla para reordenar.</p>
      <button onClick={resetConfig} className={styles.configMenuButton}>
        <FaUndo /> Resetear
      </button>
      <button onClick={() => setShowConfigMenu(false)} className={styles.configMenuButton}>
        Cerrar
      </button>
    </div>
  );

  return (
    <div className={`${styles.tableContainer} ${theme === 'dark' ? styles.dark : styles.light} ${className}`}>
      <div className={styles.controls}>
        {searchable && (
          <input
            type="text"
            placeholder="Buscar en la tabla..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className={styles.searchInput}
          />
        )}
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
                  onClick={col.sortable ? () => requestSort(col.field) : undefined}
                  style={{ cursor: col.sortable ? 'pointer' : 'default', width: col.width }}
                  title={col.headerName}
                  draggable={customizable}
                  onDragStart={(e) => onDragStart(e, col.field)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, col.field)}
                >
                  <div className={styles.headerContent}>
                    <span className={styles.headerText}>
                      {col.headerName}
                      {col.sortable && <span className={styles.sortIcon}>{getSortIcon(col.field)}</span>}
                      {col.filterable && (
                        <button className={styles.filterToggle} onClick={(e) => toggleFilter(col.field, e)}>
                          <FaFilter />
                        </button>
                      )}
                    </span>
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr key={index}>
                  {processedColumns.map((col) => {
                    const cellValue = col.cellRenderer
                      ? col.cellRenderer(row)
                      : col.valueFormatter
                      ? col.valueFormatter(row[col.field] || '')
                      : row[col.field] ?? '';
                    const displayValue = String(cellValue);
                    return (
                      <td key={`${index}-${col.field}`} title={displayValue}>
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={processedColumns.length} className={styles.noData}>
                  No hay datos disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && totalPages > 1 && (
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
            Página {currentPage} de {totalPages}
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