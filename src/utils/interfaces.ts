// Interfaz para el usuario
export interface User {
  _id: string;
  name: string;
  username: string;
  googleId: string
  rank: string;
  email: string;
  picture: string;
  entryDate: string;
  number?: string;
  active?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

//Accesos
export interface AccessInterface  {
  name: string;
  ID: string;
  password: string
}

// Interfaz para el cliente
export interface Client {
  _id: string;
  name: string;
  common: string;
  lastUpdate: string;
  lastUpdateUser:string;
  vip: boolean;
  active: boolean;
  email: string[];
  access?: AccessInterface[]
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
  sequenceNumber?: number;
}

export type AssistanceMetricsRange = 'today' | 'week' | 'month';

export interface AssistanceMetricsResponse {
  range: AssistanceMetricsRange;
  days: Array<Record<string, number | string>>;
  clientNames: string[];
  start: string;
  end: string;
}

export interface Checklist {
  action: string;
  completed: boolean;
  creationDate: string
  createdBy: string;
  completionDate: string;
  completedBy: string
}

export interface Comment {
  text: string
  userId: string
  date: string
}

export interface statusDetail {
  text: string
  date: string
}

// Interfaz para pendiente
export interface Pending {
  _id: string;
  clientId: string;
  date: string;
  title?: string | null;
  status: string;
  detail: string;
  observation: string | null;
  incidentId: string | null;
  userId: string;
  assignedUserId: string | null;
  completionDate: string | null;
  estimatedDate: string | null;
  sequenceNumber: number
  priority: number;
  statusDetail?: string;
  checklist?: Checklist[]
  comments?: Comment[]
  notifications?: string[]
}

export type BudgetStatus =
  | 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'
  | 'SENT' | 'ACCEPTED' | 'LOST' | 'EXPIRED';

export interface BudgetItem {
  description: string;
  qty: number;
  unitPrice: number;
  unit?: string;
  taxRate?: number; // 0..1
}

export interface Budget {
  _id: string;
  code: number;
  clientId: string;
  clientName: string;
  currency: 'ARS' | 'USD';
  items: BudgetItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil?: string;
  terms?: string;
  notes?: string;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
}

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En Revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  LOST: 'Perdido',
  EXPIRED: 'Vencido',
};

