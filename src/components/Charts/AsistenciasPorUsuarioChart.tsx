import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import styles from './ChartStyles.module.css';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const { name, total } = payload[0].payload;
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipTitle}>👤 {name}</p>
        <p className={styles.tooltipValue}>{total} asistencias</p>
      </div>
    );
  }
  return null;
};

const AsistenciasPorUsuarioChart: React.FC = () => {
  const [data, setData] = useState([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const params: any = {};
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;

        const res = await axios.get('/api/assistances/por-usuario', {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });

        // Validación de estructura
        const transformed = res.data.map((item: any) => ({
          name: item.usuario || item.name || 'Sin nombre',
          total: item.total || item.asistencias || 0,
        }));

        setData(transformed);
      } catch (error) {
        console.error('❌ Error al obtener asistencias:', error);
      }
    };

    fetchData();
  }, [desde, hasta]);

  if (!data?.length) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>🙋‍♂️ Asistencias por Usuario</h3>
      <p style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '14px' }}>
        🚫 No hay asistencias para el rango de fechas seleccionado.
      </p>
    </div>
  );
}

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>🙋‍♂️ Asistencias por Usuario</h3>
        <div className={styles.filters}>
          <label>
            📅 Desde:&nbsp;
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className={styles.filterInput}
            />
          </label>
          <label>
            📅 Hasta:&nbsp;
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className={styles.filterInput}
            />
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={() => 'Total asistencias'} />
          <Bar dataKey="total" fill="var(--accent)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AsistenciasPorUsuarioChart;
