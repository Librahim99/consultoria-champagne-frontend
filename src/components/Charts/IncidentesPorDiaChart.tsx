import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import styles from './ChartStyles.module.css'; // CSS moderno y aislado

interface Props {
  data: { fecha: string; total: number }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p>📅 {payload[0].payload.fecha}</p>
        <p>📊 {payload[0].value} incidentes</p>
      </div>
    );
  }
  return null;
};

const IncidentesPorDiaChart: React.FC<Props> = ({ data }) => {
  if (!data?.length) return null;

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>📊 Incidentes por Día</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--shadow-color)" />
          <XAxis
            dataKey="fecha"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
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
          <Bar
            dataKey="total"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
            barSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncidentesPorDiaChart;
