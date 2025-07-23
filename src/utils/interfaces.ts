// Interfaz para el usuario
export interface User {
  _id: string;
  username: string;
  rank: string;
  entryDate: string;
}

// Interfaz para el cliente
export interface Client {
  _id: string;
  name: string;
  common: string;
  lastUpdate: string;
  vip: boolean;
  active: boolean;
}

// Interfaz para el incidente
export interface Incident {
  _id: string;
  clientId: string;
  userId: string;
  executiveId: string;
  assignedUserId: string | null;
  type: string;
  subject: string;
  detail: string;
  observation: string;
  attachments: string[];
  order: number;
  estimatedTime: number;
  actualTime: number;
  status: string;
  creationDate: string;
  completionDate: string;
}

// Interfaz para el token decodificado
export interface DecodedToken {
  rank: string;
  id: string;
  exp?: number;
}

// Interfaz para asistencia
export interface Assistance {
  _id: string;
  clientId: string;
  userId: string;
  date: string;
  detail: string;
  contact: string;
  timeSpent: number;
  incidentId: string | null;
  pendingId: string | null;
}

// Interfaz para pendiente
export interface Pending {
  _id: string;
  clientId: string;
  date: string;
  status: string;
  detail: string;
  observation: string | null;
  incidentId: string | null;
  userId: string;
  assignedUserId: string | null;
  completionDate: string | null;
}