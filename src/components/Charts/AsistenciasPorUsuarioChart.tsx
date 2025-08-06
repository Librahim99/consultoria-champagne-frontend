import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import styles from './ChartStyles.module.css';

interface Props {
  data: { usuario: string; total: number }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.tooltip}>
        <p>👤 {payload[0].payload.usuario}</p>
        <p>🙋‍♂️ {payload[0].value} asistencias</p>
      </div>
    );
  }
  return null;
};

const AsistenciasPorUsuarioChart: React.FC<Props> = ({ data }) => {
  if (!data?.length) return null;

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
  <BarChart data={data}>
    {/* ✅ Grilla sutil para fondo oscuro */}
    <CartesianGrid
      stroke="rgba(255, 255, 255, 0.05)"
      strokeDasharray="0"
    />
    <XAxis
      dataKey="usuario"
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
    <Tooltip
      contentStyle={{ backgroundColor: '#1f1f1f', border: 'none', borderRadius: 8 }}
      labelStyle={{ color: '#ccc' }}
      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
    />
    <Bar
      dataKey="total"
      fill="var(--primary-light)"
      radius={[6, 6, 0, 0]}
      barSize={36}
    />
  </BarChart>
</ResponsiveContainer>
    </>
  );
};

export default AsistenciasPorUsuarioChart;
