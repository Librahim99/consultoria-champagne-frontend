import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import styles from './../Charts/ChartStyles.module.css';

interface DataItem {
  estado: string;
  total: number;
}

interface Props {
  data: DataItem[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const { estado, total } = payload[0].payload;
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>📌 {estado}</p>
        <p className={styles.tooltipValue}>{total} pendientes</p>
      </div>
    );
  }
  return null;
};

const PendientesPorEstado: React.FC<Props> = ({ data }) => {
  if (!data?.length) return null;

  const estadoColorMap: Record<string, string> = {
  'Resuelto': '#22c55e',       // verde
  'Pendiente': '#ef4444',      // rojo
  'En Proceso': '#facc15',     // amarillo
  'Prueba': '#3b82f6',         // azul
  'Presupuestar': '#a855f7',   // violeta
  'Presupuestado': '#8b5cf6',
  'Revisión': '#0ea5e9',
  'Cancelado': '#9ca3af',
  'Desconocido': '#6b7280'
};

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>🗂 Pendientes por Estado</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
  data={data}
  barCategoryGap="20%"
  margin={{ top: 20, right: 20, left: 0, bottom: 30 }}
>
  <CartesianGrid
    vertical={false}
    strokeDasharray="3 3"
    stroke="var(--border-color)"
  />
  <XAxis
    dataKey="estado"
    tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
    axisLine={false}
    tickLine={false}
  />
  <YAxis
    allowDecimals={false}
    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
    axisLine={false}
    tickLine={false}
  />
  <Tooltip content={<CustomTooltip />} />
  <Legend
    wrapperStyle={{ fontSize: '13px', color: 'var(--text-color)' }}
    formatter={() => 'Total pendientes'}
  />
  <Bar
    dataKey="total"
    radius={[8, 8, 0, 0]}
    barSize={32}
    isAnimationActive={true}
    animationDuration={800}
    animationEasing="ease-in-out"
  >
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={estadoColorMap[entry.estado] || '#6b7280'} />
    ))}
  </Bar>
</BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PendientesPorEstado;
