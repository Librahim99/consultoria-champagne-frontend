import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { User, DecodedToken } from "../../utils/interfaces";
import styles from "./Users.module.css";
import { jwtDecode } from "jwt-decode";
import { useContextMenu } from "../../contexts/UseContextMenu";
import { FaEdit, FaRemoveFormat, FaTrash, FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import EditUserModal from "./EditUserModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import { ranks } from "../../utils/enums";

interface UserMetrics {
  abiertos: number;
  cerrados: number;
  promedioResolucion: number;
  ultimoCierre: string | null;
}

const Users: React.FC = () => {
  const exportCSV = () => {
    const rows = users.map((user) => {
      const m = userMetricsMap[user._id];
      const total = (m?.cerrados || 0) + (m?.abiertos || 0);
      const porcentaje =
        total > 0 ? Math.round(((m?.cerrados || 0) / total) * 100) : 0;
      return {
        Usuario: user.name,
        Rol: user.rank,
        Número: user.number || "",
        Cerrados: m?.cerrados || 0,
        Abiertos: m?.abiertos || 0,
        PromedioResolucion: m?.promedioResolucion || 0,
        PorcentajeCierre: porcentaje,
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "usuarios_metricas.csv");
  };

  const exportXLSX = () => {
    const rows = users.map((user) => {
      const m = userMetricsMap[user._id];
      const total = (m?.cerrados || 0) + (m?.abiertos || 0);
      const porcentaje =
        total > 0 ? Math.round(((m?.cerrados || 0) / total) * 100) : 0;
      return {
        Usuario: user.name,
        Rol: user.rank,
        Número: user.number || "",
        Cerrados: m?.cerrados || 0,
        Abiertos: m?.abiertos || 0,
        PromedioResolucion: m?.promedioResolucion || 0,
        PorcentajeCierre: porcentaje,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    XLSX.writeFile(workbook, "usuarios_metricas.xlsx");
  };

  const [users, setUsers] = useState<User[]>([]);
  const [userMetricsMap, setUserMetricsMap] = useState<
    Record<string, UserMetrics>
  >({});
  const { showMenu } = useContextMenu();
  const [error, setError] = useState<string>("");
  const [userRank, setUserRank] = useState<string>("");
  const [filter, setFilter] = useState<string>("");
  const [modalUser, setModalUser] = useState<User | null>(null);

  const fetchUserMetrics = async (
    userId: string
  ): Promise<UserMetrics | null> => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}/metrics`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data as UserMetrics;
    } catch (err) {
      console.error(`Error al traer métricas de usuario ${userId}:`, err);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode<DecodedToken>(token);
      setUserRank(decoded.rank);
    }

    const fetchUsers = async () => {
      try {
        const res = await axios.get<User[]>(
          `${process.env.REACT_APP_API_URL}/api/users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsers(res.data);

        const metricsMap: Record<string, UserMetrics> = {};
        await Promise.all(
          res.data.map(async (user: User) => {
            const metrics = await fetchUserMetrics(user._id);
            if (metrics) metricsMap[user._id] = metrics;
          })
        );
        setUserMetricsMap(metricsMap);
      } catch (err) {
        setError("Error al cargar usuarios");
      }
    };

    fetchUsers();
  }, []);

  const getPerformanceClass = (
    percentage: number
  ): "low" | "medium" | "high" => {
    if (percentage < 50) return "low";
    if (percentage < 80) return "medium";
    return "high";
  };

  const openEditModal = (user: User) => {
    setModalUser(user);
  };

  const closeModal = () => {
    setModalUser(null);
  };

  const handleDelete = useCallback(
    async (deletedUser: User) => {
      if (deletedUser) {
        if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
        try {
          const token = localStorage.getItem("token");
          await axios.delete(
            `${process.env.REACT_APP_API_URL}/api/users/${deletedUser._id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // Actualizar el estado optimistamente
          setUsers((prevUsers) =>
            prevUsers.filter((u) => u._id !== deletedUser._id)
          );
          // Eliminar métricas asociadas al usuario
          setUserMetricsMap((prevMetrics) => {
            const newMetrics = { ...prevMetrics };
            delete newMetrics[deletedUser._id];
            return newMetrics;
          });

          toast.success("Usuario eliminado correctamente.");
        } catch (err) {
          toast.error("Error al elminar usuario");
        }
      } else {
        toast.error("No se seleccionó usuario.");
      }
    },
    [users]
  );

  const handleUserUpdate = async (updatedUser: {
    name: string;
    number: string;
    rank: string;
  }) => {
    if (!modalUser) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/users/${modalUser._id}`,
        updatedUser,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data) {
        setUsers((prev) =>
          prev.map((u) => (u._id === modalUser._id ? { ...u, ...res.data } : u))
        );
        closeModal();
        toast.success("Usuario actualizado.");
      }
    } catch (err) {
      console.error("Error actualizando usuario", err);
      toast.error("Error al actualizar usuario");
    }
  };

  const sendWhatsAppReminder = async (user: User) => {
    const message = 
      `Hola ${user.name}, te recordamos que tenés ${
        userMetricsMap[user._id]?.abiertos
      } tickets pendientes por resolver.`
    
    const number = user.number;
    if (number) {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/bot/sendMessage`,
        { number, message },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Recordatorio enviado correctamente.')
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(filter.toLowerCase()) ||
      user.rank.toLowerCase().includes(filter.toLowerCase())
  );

  const chartData = users.map((user) => {
    const m = userMetricsMap[user._id];
    const total = (m?.cerrados || 0) + (m?.abiertos || 0);
    const porcentaje =
      total > 0 ? Math.round(((m?.cerrados || 0) / total) * 100) : 0;
    return {
      name: user.name,
      Cerrados: m?.cerrados || 0,
      Abiertos: m?.abiertos || 0,
      CierrePorcentaje: porcentaje,
    };
  });

  const handleContextMenu = useCallback(
    (user: User, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const menuItems = [
        {
          label: " Modificar",
          icon: <FaEdit />,
          onClick: () => openEditModal(user),
        },
        {
          label: " Eliminar",
          icon: <FaTrash />,
          onClick: () => handleDelete(user),
          disabled: userRank !== ranks.TOTALACCESS,
        }
      ];
      if(user.number && userMetricsMap[user._id]?.abiertos > 5) {
        menuItems.push({
          label: " Enviar recordatorio",
          icon: <FaWhatsapp />,
          onClick: () => sendWhatsAppReminder(user),
          disabled: userRank !== ranks.CONSULTORCHIEF && userRank !== ranks.TOTALACCESS
        })
      }
      showMenu(e.clientX, e.clientY, menuItems);
    },
    [openEditModal, showMenu]
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>👥 Panel de Usuarios 👥</h1>

      <div className={styles.exportActions}>
        <button onClick={exportCSV} className={styles.exportButton}>
          📤 Exportar CSV
        </button>
        <button onClick={exportXLSX} className={styles.exportButton}>
          📥 Exportar XLSX
        </button>
      </div>

      <input
        type="text"
        placeholder="🔍 Buscar usuario o rol..."
        onChange={(e) => setFilter(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.chartCard}>
        <h2
          style={{
            textAlign: "center",
            color: "var(--text-color)",
            marginBottom: "1rem",
          }}
        >
          📊 Rendimiento Global de Usuarios
        </h2>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            color: "var(--text-color)",
            fontWeight: 500,
          }}
        >
          <div>
            🔓 Abiertos Totales:{" "}
            {users.reduce(
              (acc, u) => acc + (userMetricsMap[u._id]?.abiertos || 0),
              0
            )}
          </div>
          <div>
            ✅ Cerrados Totales:{" "}
            {users.reduce(
              (acc, u) => acc + (userMetricsMap[u._id]?.cerrados || 0),
              0
            )}
          </div>
          <div>
            📈 % Cierre Promedio:{" "}
            {(() => {
              const abiertos = users.reduce(
                (acc, u) => acc + (userMetricsMap[u._id]?.abiertos || 0),
                0
              );
              const cerrados = users.reduce(
                (acc, u) => acc + (userMetricsMap[u._id]?.cerrados || 0),
                0
              );
              const total = abiertos + cerrados;
              return total > 0
                ? Math.round((cerrados / total) * 100) + "%"
                : "0%";
            })()}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Abiertos" stackId="a" fill="#007bff" />
            <Bar dataKey="Cerrados" stackId="a" fill="#28a745" />
            <Bar
              dataKey="CierrePorcentaje"
              name="% Cierre"
              shape={(props: any) => {
                const x = Number(props.x ?? 0);
                const y = Number(props.y ?? 0);
                const width = Number(props.width ?? 0);
                const height = Number(props.height ?? 0);
                const value = props.payload?.CierrePorcentaje ?? 0;

                let color = "#f44336";
                if (value >= 80) color = "#4caf50";
                else if (value >= 50) color = "#ffc107";

                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={color}
                      rx={4}
                      ry={4}
                    />
                    <text
                      x={x + width / 2}
                      y={y - 5}
                      fill="#fff"
                      textAnchor="middle"
                      fontSize={12}
                    >
                      {value}%
                    </text>
                  </g>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.userGrid}>
        {filteredUsers.map((user) => {
          const metrics = userMetricsMap[user._id];
          const total = (metrics?.cerrados || 0) + (metrics?.abiertos || 0);
          const cierrePorcentaje =
            total > 0
              ? Math.round(((metrics?.cerrados || 0) / total) * 100)
              : 0;
          const performanceClass = getPerformanceClass(cierrePorcentaje);

          return (
            <motion.div
              key={user._id}
              className={styles.userCard}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onContextMenu={(e) => handleContextMenu(user, e)}
            >
              <img src={user.picture} alt="Profile" className={styles.avatar}/>
              <div className={styles.userHeader}>
                <h3>{user.name}</h3>
                <span className={`${styles.badge} ${styles.total}`}>
                  {user.rank}
                </span>
              </div>
              <div className={styles.userDetails}>
                {user.number && <p>📱 {user.number}</p>}
                <p>🟢 Estado: {user.active ? "Activo" : "Inactivo"}</p>
                {user.lastLogin && (
                  <p>
                    🕓 Último acceso:{" "}
                    {new Date(user.lastLogin).toLocaleString()}
                  </p>
                )}
              </div>
              {metrics && (
                <div className={styles.metrics}>
                  <p>📌 Abiertos: {metrics.abiertos}</p>
                  <p>✅ Cerrados: {metrics.cerrados}</p>
                  <p>
                    ⏱️ Promedio: {Math.round(metrics.promedioResolucion)} min
                  </p>
                  <div className={styles.performanceIndicator}>
                    <span
                      className={`${styles.dot} ${styles[performanceClass]}`}
                    />
                    % Cierre: {cierrePorcentaje}%
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {modalUser && (
          <EditUserModal
            user={modalUser}
            onCancel={closeModal}
            onSave={handleUserUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
