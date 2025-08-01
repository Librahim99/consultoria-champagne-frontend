export const ranks = {
  TOTALACCESS: 'CEO',
  CONSULTOR: 'Consultor',
  CONSULTORCHIEF:'Jefe de Consultoría',
  CONSULTORJR: 'Consultor Junior',
  DEV: 'Desarrollador',
  DEVCHIEF: 'Jefe de Programación',
  ADMIN: 'Administración',
  GUEST: 'Invitado',
  MKT: 'Marketing'
} as const;

export const incident_status = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Proceso',
  TEST:'Prueba',
  SOLVED: 'Resuelto',
  TO_BUDGET: 'Presupuestar',
  BUDGETED: 'Presupuestado',
  REVISION: 'Revisión',
  CANCELLED: 'Cancelado'
} as const;

export const incident_types = {
  TICKET: 'Whatsapp Ticket',
  DEV_BUG: 'Falla',
  DEV_IMPROVEMENT: 'Mejora',
  DEV_NEW: 'Nueva opción'
} as const;
