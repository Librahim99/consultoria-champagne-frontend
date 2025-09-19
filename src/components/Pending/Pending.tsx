/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { pending_status, priority, ranks } from "../../utils/enums";
import {
  type Pending,
  Client,
  User,
  DecodedToken,
  Assistance,
} from "../../utils/interfaces";
import styles from "./Pending.module.css";
import CustomTable from "../CustomTable/CustomTable";
import { useContextMenu } from "../../contexts/UseContextMenu";
import { toast } from "react-toastify";
import {
  FaEdit,
  FaTrash,
  FaWhatsapp,
  FaPlus,
  FaEye,
  FaFileCsv,
  FaCheckCircle,
  FaPeopleArrows,
  FaCheck,
  FaCheckSquare,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Modal from "../Modal/Modal";
import styles2 from "../CustomContextMenu/CustomContextMenu.module.css";
import ImportCSVModal from "../ImportacionCSV/ImportarCSV";
import Spinner from "../Spinner/Spinner";
import PendingDetailModal from "./PendingDetailModal";

// Función para mapear valores legibles a claves del enum
const mapStatusToKey = (value: string): keyof typeof pending_status | "" => {
  const entry = Object.entries(pending_status).find(
    ([_, val]) => val === value
  );
  return entry ? (entry[0] as keyof typeof pending_status) : "";
};

interface Resume {
  total: number,
  solved: number
}  

const PendingTask: React.FC = () => {
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [error, setError] = useState<string>("");
  const { showMenu } = useContextMenu();
  const [editingPending, setEditingPending] = useState<Pending | null>(null);
  const [newPending, setNewPending] = useState<Pending>({
    _id: "",
    clientId: "",
    date: new Date().toISOString(),
    title: null,
    status: "Pendiente", // Valor legible por defecto
    detail: "",
    observation: null,
    incidentId: null,
    userId: "",
    assignedUserId: null,
    completionDate: null,
    estimatedDate: null,
    priority: 5,
    sequenceNumber: pendings.length + 1,
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRank, setUserRank] = useState<string>("");
  const [loggedInUserId, setLoggedInUserId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();
  const [showImportModal, setShowImportModal] = useState(false);
  const [userFilter, setUserFilter] = useState("me");
  const [dateFilter, setDateFilter] = useState("month");
  const [statusFilter, setStatusFilter] = useState("pending_inprogress");
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [selectedPending, setSelectedPending] = useState<Pending | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [filteredClient, setFilteredClient] = useState<Client | null>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const [resume, setResume] = useState<Resume>({total: 0, solved: 0});


  useEffect(() => {
    if (showAddForm && clientInputRef.current) {
      clientInputRef.current.focus();
    }
  }, [showAddForm]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No se encontró el token de autenticación");
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      setUserRank(decoded.rank);
      setLoggedInUserId(decoded.id);
      setNewPending((prev) => ({ ...prev, userId: decoded.id }));
    } catch (decodeError) {
      console.error("Error decoding token:", decodeError);
      setError("Token inválido o corrupto");
      return;
    }

    const fetchData = async () => {
      try {
        const [clientsRes, usersRes] = await Promise.all([
          axios.get<Client[]>(
            `${process.env.REACT_APP_API_URL}/api/clients/minimal`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get<User[]>(
            `${process.env.REACT_APP_API_URL}/api/users/minimal`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ]);
        setClients(clientsRes.data);
        setUsers(usersRes.data);
      } catch (err: any) {
        console.error(
          "Fetch Error Details:",
          err.response?.data || err.message,
          err.response?.status
        );
        setError(err.response?.data?.message || "Error al cargar datos");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const viewModeKey = `viewMode_pendingTable`;
    const savedViewMode = localStorage.getItem(viewModeKey) as
      | "table"
      | "kanban"
      | null;
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  const handleEdit = useCallback(
    (pending: Pending) => {
      if (userRank === ranks.GUEST) {
        setError("No tienes permisos para editar");
        return;
      }
      // Mapear status a valor legible, con fallback a 'Pendiente'
      const statusValue =
        pending.status &&
        pending_status[pending.status as keyof typeof pending_status]
          ? pending_status[pending.status as keyof typeof pending_status]
          : "Pendiente";
      // Inicializar newPending con fallbacks para evitar null/undefined
      setNewPending({
        _id: pending._id || "",
        clientId: pending.clientId || "",
        userId: pending.userId || loggedInUserId,
        date: pending.date
          ? new Date(pending.date).toISOString()
          : new Date().toISOString(),
        title: pending.title || null,
        status: statusValue,
        detail: pending.detail || "",
        observation: pending.observation || null,
        incidentId: pending.incidentId || null,
        assignedUserId: pending.assignedUserId || null,
        completionDate: pending.completionDate || null,
        priority: pending.priority || 5,
        sequenceNumber: pendings.length + 1,
        estimatedDate: pending.estimatedDate || null,
      });

      setEditingPending(pending);
      setShowAddForm(true);
    },
    [userRank, loggedInUserId]
  );

  const handleRowClick = (pending: Pending) => {
    setSelectedPending(pending);
    setShowDetailModal(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setNewPending((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token available for submission");
      return;
    }

    if (!newPending.clientId || !newPending.detail) {
      setError("Faltan campos requeridos: Cliente o Detalle");
      return;
    }

    const statusKey = mapStatusToKey(newPending.status);
    if (!statusKey) {
      setError("Estado no válido");
      return;
    }

    try {
      if (editingPending) {
        const res = await axios.put(
          `${process.env.REACT_APP_API_URL}/api/pending/${editingPending._id}`,
          { ...newPending, status: statusKey },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Normalizar con status como key (clave del enum)
        const updatedPending: Pending = {
          _id: res.data._id || editingPending._id,
          clientId: res.data.clientId || "",
          userId: res.data.userId || loggedInUserId,
          date: res.data.date
            ? new Date(res.data.date).toISOString()
            : new Date().toISOString(),
            title: res.data.title || null,
          status: res.data.status, // clave, ej: 'PENDING'
          detail: res.data.detail || "",
          observation: res.data.observation || null,
          incidentId: res.data.incidentId || null,
          assignedUserId: res.data.assignedUserId || null,
          completionDate: res.data.completionDate || null,
          sequenceNumber: res.data.sequenceNumber,
          priority: res.data.priority,
          estimatedDate: res.data.estimatedDate || null,
        };
        setPendings(
          pendings.map((p) =>
            p._id === editingPending._id ? updatedPending : p
          )
        );
        setEditingPending(null);
        toast.success("Tarea pendiente actualizada");
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/pending`,
          { ...newPending, status: statusKey },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // Normalizar con status como key
        const newPendingData: Pending = {
          _id: res.data._id || "",
          clientId: res.data.clientId || "",
          userId: res.data.userId || loggedInUserId,
          date: res.data.date
            ? new Date(res.data.date).toISOString()
            : new Date().toISOString(),
            title: res.data.title || null,
          status: res.data.status, // clave, ej: 'PENDING'
          detail: res.data.detail || "",
          observation: res.data.observation || null,
          incidentId: res.data.incidentId || null,
          assignedUserId: res.data.assignedUserId || null,
          completionDate: res.data.completionDate || null,
          estimatedDate: res.data.estimatedDate || null,
          sequenceNumber: res.data.sequenceNumber,
          priority: res.data.priority,
        };
        setPendings([...pendings, newPendingData]);
        toast.success("Tarea pendiente creada");
      }
      setShowAddForm(false);
      setNewPending({
        _id: "",
        clientId: "",
        date: new Date().toISOString(),
        title: null,
        status: "Pendiente",
        detail: "",
        observation: null,
        incidentId: null,
        userId: loggedInUserId,
        assignedUserId: null,
        completionDate: null,
        priority: 5,
        sequenceNumber: pendings.length + 1,
        estimatedDate: null,
      });
      setClientSearch(""); // Nuevo: Reset post-submit
      setFilteredClient(null); // Nuevo: Reset post-submit
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al guardar pendiente");
    }
  };

  const handleDelete = useCallback(
    async (pending: Pending) => {
      if (userRank !== ranks.TOTALACCESS) {
        setError("No tienes permisos para eliminar");
        return;
      }
      if (!window.confirm("¿Estás seguro de eliminar esta tarea pendiente?"))
        return;
      const token = localStorage.getItem("token");
      try {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/api/pending/${pending._id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPendings(pendings.filter((p) => p._id !== pending._id));
        toast.success("Tarea eliminada");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Error al eliminar tarea");
      }
    },
    [pendings, userRank]
  );

  const getUserPictures = () => {
    const data = users.map((u) => {
      return {
        userId: u._id,
        picture: u.picture,
      };
    });
    return data;
  };

  const handleNewPending = useCallback(() => {
    if (userRank === ranks.GUEST) {
      setError("No tienes permisos para crear");
      return;
    }
    setEditingPending(null);
    setNewPending({
      _id: "",
      clientId: "",
      date: new Date().toISOString(),
      title: null,
      status: "Pendiente",
      detail: "",
      observation: null,
      incidentId: null,
      userId: loggedInUserId,
      assignedUserId: null,
      completionDate: null,
      priority: 5,
      sequenceNumber: pendings.length + 1,
      estimatedDate: null,
    });
    setClientSearch(""); // Nuevo: Reset
    setFilteredClient(null); // Nuevo: Reset
    setShowAddForm(true);
  }, [userRank, loggedInUserId]);

  const handleSendWhatsapp = useCallback(async (pending: Pending) => {
    if (!window.confirm("¿Enviar resumen al creador vía WhatsApp?")) return;
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/bot/sendPending`, {
        pendingId: pending._id,
        targetUserId: pending.userId,
      });
      toast.success("Resumen enviado al creador");
    } catch (err) {
      toast.error("Error al enviar resumen");
    }
  }, []);

  const toggleViewMode = () => {
    const newMode = viewMode === "table" ? "kanban" : "table";
    setViewMode(newMode);
    const viewModeKey = `viewMode_pendingTable`;
    localStorage.setItem(viewModeKey, newMode);
  };

  const handleSendWhatsappToUser = useCallback(
    async (pending: Pending, user: User) => {
      if (!window.confirm(`¿Enviar resumen a ${user.name} vía WhatsApp?`))
        return;
      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/api/bot/sendPending`,
          { pendingId: pending._id, targetUserId: user._id }
        );
        toast.success(`Resumen enviado a ${user.name}`);
      } catch (err) {
        toast.error("Error al enviar resumen");
      }
    },
    []
  );

  const handleViewIncidence = useCallback(
    (pending: Pending) => {
      if (pending.incidentId) {
        navigate(`/incidents/${pending.incidentId}`);
      }
    },
    [navigate]
  );

  const handleViewAssistance = useCallback(
    async (pending: Pending) => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/assistances`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const assistance = res.data.find(
          (a: Assistance) => a.pendingId === pending._id
        );
        if (assistance) {
          navigate(`/assistances/${assistance._id}`);
        } else {
          toast.info("No hay asistencia asociada a esta tarea pendiente");
        }
      } catch (err: any) {
        toast.error("Error al buscar asistencia");
      }
    },
    [navigate]
  );

  const handleChangeStatus = useCallback(
    async (id: string, status: string, table: boolean) => {
      if (!status || !id) {
        toast.error("No se actualizó el estado: Opción no valida");
        return;
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        if (table) status = mapStatusToKey(status);
        const res = await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/pending/${id}/status`,
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPendings(
          pendings.map((p) => (p._id === res.data._id ? res.data : p))
        );
        toast.success("Estado actualizado");
      } catch (err) {
        console.log("Error al actualizar estado", err);
        toast.success("Error al actualizar estado");
      }
    },
    [pendings, navigate]
  );

  const handleChangePriority = useCallback(
    async (id: string, priority: string) => {
      if (!priority || !id) {
        toast.error("No se actualizó la prioridad: Opción no valida");
        return;
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        const res = await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/pending/${id}/priority/${priority}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPendings(
          pendings.map((p) => (p._id === res.data._id ? res.data : p))
        );
        toast.success("Prioridad actualizada");
      } catch (err) {
        console.log("Error al actualizar prioridad", err);
        toast.success("Error al actualizar prioridad");
      }
    },
    [pendings, navigate]
  );

const handleTransfer = useCallback(
  async (pending: Pending, user: User) => {
    if (!pending || !user) {
      toast.warning("No se seleccionó pendiente o usuario");
      return;
    }
    try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        const id = pending._id;
        const userid = user._id;
        const res = await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/pending/${id}/changeUser/${userid}`
        );
        setPendings(
          pendings.map((p) => (p._id === res.data._id ? res.data : p))
        );
        toast.success("Pendiente asignado");

        try {
          const message = `Hola ${user.name}, ${getUserName(
            loggedInUserId
          )} te transfirió el pendiente N° ${
            pending?.sequenceNumber
          } de ${getClientName(pending.clientId)}:\n\n-${pending.detail}.`;

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
            toast.success("Mensaje enviado correctamente.");
          }
        } catch (err) {}
      } catch (err) {
        console.log("Error al transferir pendiente", err);
        toast.success("Error al transferir pendiente");
      }
    },
    [pendings, navigate]
  );


  const handleAssign = useCallback(
    async (pending: Pending, user: User) => {
      if (!pending || !user) {
        toast.warning("No se seleccionó pendiente o usuario");
        return;
      }
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/");
          return;
        }
        const id = pending._id;
        const assignedUserId = user._id;
        const res = await axios.patch(
          `${process.env.REACT_APP_API_URL}/api/pending/${id}/assign`,
          { assignedUserId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPendings(
          pendings.map((p) => (p._id === res.data._id ? res.data : p))
        );
        toast.success("Pendiente asignado");

        try {
          const message = `Hola ${user.name}, ${getUserName(
            loggedInUserId
          )} te asignó el pendiente N° ${
            pending?.sequenceNumber
          } de ${getClientName(pending.clientId)}:\n\n-${pending.detail}.`;

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
            toast.success("Mensaje enviado correctamente.");
          }
        } catch (err) {}
      } catch (err) {
        console.log("Error al asignar pendiente", err);
        toast.success("Error al asignar pendiente");
      }
    },
    [pendings, navigate]
  );

  const getRowContextMenu2 = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const menuItems = [
        {
          label: " Nuevo Pendiente",
          icon: <FaPlus />,
          onClick: handleNewPending,
          disabled: userRank === ranks.GUEST,
        },
        {
          label: " Importar Pendientes",
          icon: <FaFileCsv />,
          onClick: () => setShowImportModal(true),
          disabled: userRank === ranks.GUEST,
        },
      ];
      showMenu(e.clientX, e.clientY, menuItems);
    },
    [showMenu, handleNewPending]
  );

  const getRowContextMenu = useCallback(
    (row: Pending) => [
      {
        label: " Modificar",
        icon: <FaEdit />,
        onClick: () => handleRowClick(row),
        hide:
          loggedInUserId !== row.userId &&
          loggedInUserId !== row.assignedUserId &&
          userRank !== ranks.TOTALACCESS,
      },
      {
        label: " Ver",
        icon: <FaEye />,
        onClick: () => handleRowClick(row),
        hide:
          loggedInUserId === row.userId ||
          loggedInUserId === row.assignedUserId ||
          userRank === ranks.TOTALACCESS,
      },
      {
        label: " Nuevo Pendiente",
        icon: <FaPlus />,
        onClick: handleNewPending,
      },
      {
        label: " Cambiar Estado",
        icon: <FaCheckCircle />,
        onClick: () => {},
        hide:
          loggedInUserId !== row.userId &&
          loggedInUserId !== row.assignedUserId &&
          userRank !== ranks.TOTALACCESS,
        children: Object.entries(pending_status).map((status) => ({
          label: `${status[1]}`,
          onClick: () => handleChangeStatus(row._id, status[1], true),
        })),
      },
      {
        label: " Asignar",
        icon: <FaPeopleArrows />,
        onClick: () => {},
        hide: loggedInUserId !== row.userId && userRank !== ranks.TOTALACCESS,
        children: users
          .filter((u) => u._id !== row.userId)
          .map((user) => ({
            icon: (
              <img
                src={user.picture}
                alt="profile"
                className={styles2.userIcon}
              />
            ),
            label: ` ${user.name}`,
            onClick: () => handleAssign(row, user),
          })),
      },
      ,
      {
        label: " Transferir",
        icon: <FaPeopleArrows />,
        onClick: () => {},
        hide: loggedInUserId !== row.userId && userRank !== ranks.TOTALACCESS && userRank !== ranks.CONSULTORCHIEF,
        children: users
          .filter((u) => u._id !== row.userId)
          .map((user) => ({
            icon: (
              <img
                src={user.picture}
                alt="profile"
                className={styles2.userIcon}
              />
            ),
            label: ` ${user.name}`,
            onClick: () => handleTransfer(row, user),
          })),
      },
      {
        label: " Cambiar Prioridad",
        icon: <FaEdit />,
        onClick: () => {},
        hide:
          loggedInUserId !== row.userId &&
          loggedInUserId !== row.assignedUserId &&
          userRank !== ranks.TOTALACCESS &&
          userRank !== ranks.CONSULTORCHIEF,
        children: Object.entries(priority).map((pr) => ({
          label: `${pr[1]}`,
          onClick: () => handleChangePriority(row._id, pr[0]),
        })),
      },
      {
        label: ` Enviar a ${getUserName(row.userId).split(" ")[0]}`,
        icon: <FaWhatsapp />,
        onClick: () => handleSendWhatsapp(row),
        hide: !getUserNumber(row.userId),
      },
      {
        label: " Enviar a...",
        icon: <FaWhatsapp />,
        onClick: () => {},
        children: users
          .filter((u) => u._id !== row.userId)
          .map((user) => ({
            icon: (
              <img
                src={user.picture}
                alt="profile"
                className={styles2.userIcon}
              />
            ),
            label: ` ${user.name}`,
            onClick: () => handleSendWhatsappToUser(row, user),
            hide: user.number ? false : true,
          })),
      },
      {
        label: " Ver Incidencia",
        icon: <FaEye />,
        onClick: () => handleViewIncidence(row),
        hide: row.incidentId ? false : true,
      },
      {
        label: " Importar Pendientes",
        icon: <FaFileCsv />,
        onClick: () => setShowImportModal(true),
        disabled: userRank === ranks.GUEST,
      },
      {
        label: " Eliminar",
        icon: <FaTrash />,
        onClick: () => handleDelete(row),
        hide: userRank !== ranks.TOTALACCESS,
      },
    ],
    [
      userRank,
      users,
      handleNewPending,
      handleEdit,
      handleSendWhatsapp,
      handleSendWhatsappToUser,
      handleViewIncidence,
      handleDelete,
    ]
  );

  const getClientNameAndCommon = (clientId: string | null) => {
    const client = clients.find((c) => c._id === clientId);
    return client ? `[${client.common}] ${client.name}` : "Desconocido";
  };

  const getClientName = (clientId: string | null) => {
    const client = clients.find((c) => c._id === clientId);
    return client ? client.name : "Desconocido";
  };

  const getUserName = (userId: string | null) => {
    const user = users.find((u) => u._id === userId);
    return user ? user.name : "";
  };

  const getUserNumber = (userId: string | null) => {
    const user = users.find((u) => u._id === userId);
    return user.number ? true : false;
  };

  const fetchPendings = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");
      const res = await axios.get<Pending[]>(
        `${process.env.REACT_APP_API_URL}/api/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { userFilter, dateFilter, statusFilter },
        }
      );
      const resume = await axios.get<Resume>(
        `${process.env.REACT_APP_API_URL}/api/pending/resume`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { userFilter},
        }
      );
      setResume(resume.data)
      setPendings(res.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Error fetching pendings";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [userFilter, dateFilter, statusFilter]);

  useEffect(() => {
    fetchPendings();
  }, [fetchPendings]); // Se dispara cuando fetchPendings cambia (i.e., cuando cambian sus deps)

  const handleFilterChange = (
    type: "user" | "date" | "status",
    value: string
  ) => {
    if (type === "user") setUserFilter(value);
    if (type === "date") setDateFilter(value);
    if (type === "status") setStatusFilter(value);
  };

  if (!users.length || !pendings || !clients.length) return <Spinner />;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}> 📚 Tareas Pendientes 📚<h4 className={styles.resume}>Total: {resume.total} <FaCheckSquare style={{"color":"gray", "backgroundColor": "black"} }/>|    Resuelto: {resume.solved} <FaCheckSquare style={{"color":"green", "backgroundColor": "black"} }/></h4></h1>
      {error && <p className={styles.error}>{error}</p>}
      <div
        onContextMenu={(e) => getRowContextMenu2(e)}
        style={{ height: "auto", width: "100%" }}
      >
        <CustomTable
          rowData={pendings}
          columnDefs={[
            {
              field: "clientId",
              headerName: "Cliente",
              sortable: true,
              filterable: true,
              valueFormatter: (value) => getClientNameAndCommon(value),
            },
            {
              field: "userId",
              headerName: "Usuario",
              sortable: true,
              filterable: true,
              valueFormatter: (value) => getUserName(value),
            },
            {
              field: "assignedUserId",
              headerName: "Asignado",
              sortable: true,
              filterable: true,
              valueFormatter: (value) => getUserName(value),
            },
            {
              field: "date",
              headerName: "Fecha",
              sortable: true,
              filterable: true,
              valueFormatter: (value) => new Date(value).toLocaleDateString(),
            },
            {
              field: "status",
              headerName: "Estado",
              sortable: true,
              filterable: true,
              valueFormatter: (value) =>
                pending_status[value as keyof typeof pending_status] || value,
            },
            {
              field: "detail",
              headerName: "Detalle",
              sortable: true,
              filterable: true,
            },
            {
              field: "observation",
              headerName: "Observación",
              sortable: true,
              filterable: true,
            },
            {
              field: "sequenceNumber",
              headerName: "Número",
              sortable: true,
              filterable: true,
              valueFormatter: (value) =>
                value ? value : "Sin número asignado",
            },
            {
              field: "incidentNumber",
              headerName: "Incidencia",
              sortable: true,
              filterable: true,
            },
            {
              field: "priority",
              headerName: "Prioridad",
              sortable: true,
              filterable: true,
              valueFormatter: (value) => {
                const levels = Object.entries(priority);
                return levels[value - 1][1] || "SIN PRIORIDAD";
              },
            },
            {
              field: "estimatedDate",
              headerName: "Fecha Estimada",
              sortable: true,
              filterable: true,
              valueFormatter: (value) => value ? new Date(value).toLocaleDateString() : '',
            },
            {
              field: "title",
              headerName: "Titulo",
              sortable: true,
              filterable: true
            },
            {
              field: "statusDetail",
              headerName: "Detalle de estado",
              sortable: true,
              filterable: true
            },
          ]}
          pagination={true}
          defaultPageSize={15}
          searchable={true}
          customizable={true}
          storageKey="pendingTable"
          onRowContextMenu={getRowContextMenu}
          enableUserFilter={true}
          enableDateFilter={true}
          enableStatusFilter={true}
          onFilterChange={handleFilterChange}
          enableKanbanView={true}
          kanbanStatuses={Object.entries(pending_status).map(
            ([key, label]) => ({ key, label })
          )}
          onStatusChange={handleChangeStatus}
          onRowClick={handleRowClick}
          loggedInUserId={loggedInUserId}
          userPictures={getUserPictures()}
          userRank={userRank}
        />
      </div>
      <Modal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setClientSearch(""); // Nuevo: Reset al cerrar
          setFilteredClient(null); // Nuevo: Reset al cerrar
        }}
        title={
          editingPending ? "Editar Tarea Pendiente" : "Agregar Tarea Pendiente"
        }
      >
        <form onSubmit={handleSubmit} className="modalForm">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <div className="formGroup" style={{ flex: 1, maxWidth: "45%" }}>
              <label>Fecha</label>
              <input
                style={{ minHeight: "30%", height: "30%", maxHeight: "30%" }}
                type="date"
                name="date"
                value={new Date(newPending.date).toISOString().split("T")[0]}
                onChange={handleInputChange}
                required
              />
            </div>
            <div
              className="formGroup"
              style={{ flex: 1, maxWidth: "50%", marginLeft: "5%" }}
            >
              <label>Estado *</label>
              <select
                style={{
                  minHeight: "61.77%",
                  height: "61.77%",
                  maxHeight: "61.77%",
                }}
                name="status"
                value={newPending.status || ""}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione un estado</option>
                {Object.values(pending_status).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="formGroup">
            <label>Cliente *</label>
            <input
              ref={clientInputRef} // Nuevo: Ref para focus
              type="text"
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={(e) => {
                const val = e.target.value;
                setClientSearch(val);
                const match = clients.find(
                  (c) =>
                    c.name.toLowerCase().includes(val.toLowerCase()) ||
                    (c.common &&
                      c.common.toLowerCase().includes(val.toLowerCase()))
                );
                if (match) {
                  setFilteredClient(match);
                  setNewPending((prev) => ({ ...prev, clientId: match._id }));
                } else {
                  setFilteredClient(null);
                  setNewPending((prev) => ({ ...prev, clientId: "" }));
                }
                if (val === "") setFilteredClient(null);
              }}
              required
            />
            {filteredClient && (
              <div className={styles.clientText}>
                {" "}
                {/* Reusa estilo de Assistances o agrega en Pending.module.css */}
                ➤ {filteredClient.name}
              </div>
            )}
          </div>

          <div className="formGroup">
            <label>Detalle *</label>
            <textarea
              name="detail"
              value={newPending.detail || ""}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="formGroup">
            <label>Observación</label>
            <input
              type="text"
              name="observation"
              value={newPending.observation || ""}
              onChange={handleInputChange}
            />
          </div>
          <button type="submit">
            {editingPending ? "Actualizar" : "Crear"} Tarea Pendiente
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setClientSearch("");
              setFilteredClient(null);
            }}
          >
            Cancelar
          </button>
        </form>
      </Modal>
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importar Pendientes desde CSV"
      >
        <ImportCSVModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchPendings}
        />
      </Modal>
      <PendingDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        pending={selectedPending!}
        users={users}
        client={getClientName(selectedPending?.clientId)}
        onUpdate={(updated) => {
          setPendings(
            pendings.map((p) => (p._id === updated._id ? updated : p))
          );
        }}
        loggedInUserId={loggedInUserId}
        userRank={userRank}
        onAssign={handleAssign} // Nuevo: Pasa handleAssign
      />
    </div>
  );
};

export default PendingTask;
