import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PendienteEstadoData {
  _id: string;
  total: number;
}

interface Props {
  data: PendienteEstadoData[];
}

const PendientesPorEstadoChart: React.FC<Props> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
  <ResponsiveContainer>
  <BarChart data={data}>
    {/* ✅ Grilla elegante con líneas horizontales y verticales */}
    <CartesianGrid
      stroke="rgba(255, 255, 255, 0.05)" // color tenue para fondo oscuro
      strokeDasharray="0"               // líneas sólidas
    />
    <XAxis
      dataKey="_id"
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
      fill="#f43f5e"
      barSize={36}
      radius={[6, 6, 0, 0]}
    />
  </BarChart>
</ResponsiveContainer>

</div>
  );
};

export default PendientesPorEstadoChart;
