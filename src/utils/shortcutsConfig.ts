// utils/shortcutsConfig.ts
import { FaUser, FaUsers, FaBug, FaClipboardCheck, FaChartPie } from 'react-icons/fa';
import { ranks, UserRank } from './enums';
import { hasAccess } from './hasAccess';

export const getDashboardShortcuts = (stats: any, userRank: UserRank) => [
  {
    id: 'users',
    to: '/users',
    title: 'Usuarios',
    description: `${stats.users} registrados`,
    icon: FaUser,
    bg: 'linear-gradient(135deg, #3b82f6, #1e40af)',
    visible: hasAccess(userRank, [ranks.TOTALACCESS, ranks.CONSULTORCHIEF]),
  },
  {
    id: 'clients',
    to: '/clients',
    title: 'Clientes',
    description: `${stats.clients} activos`,
    icon: FaUsers,
    bg: 'linear-gradient(135deg, #10b981, #047857)',
    visible: true,
  },
  {
    id: 'incidents',
    to: '/incidents',
    title: 'Incidencias',
    description: `${stats.incidents} pendientes`,
    icon: FaBug,
    bg: 'linear-gradient(135deg, #f59e0b, #b45309)',
    visible: true,
  },
  {
    id: 'assistances',
    to: '/assistances',
    title: 'Asistencias',
    description: `${stats.assistances} registradas`,
    icon: FaClipboardCheck,
    bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    visible: true,
  },
  {
    id: 'pending',
    to: '/pending-tasks',
    title: 'Pendientes',
    description: `${stats.pendings} en espera`,
    icon: FaChartPie,
    bg: 'linear-gradient(135deg, #ec4899, #db2777)',
    visible: true,
  },
];
