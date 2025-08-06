import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface PendientePorUsuario {
  nombreUsuario: string;
  cantidad: number;
}

interface Props {
  data: PendientePorUsuario[];
}

const PendientesPorUsuarioChart: React.FC<Props> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <XAxis dataKey="nombreUsuario" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="cantidad" fill="#ec4899" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PendientesPorUsuarioChart;
