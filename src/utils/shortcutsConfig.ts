import { FaUsers, FaChartPie } from 'react-icons/fa';
import { UserRank } from './enums';
import { hasAccess } from './hasAccess';

type Stats = {
  users?: number;
  clients?: number;
  incidents?: number;
  pendings?: number;
  assistances?: number;
};

export const getDashboardShortcuts = (stats: Stats, _userRank: UserRank) => [
  {
    id: 'clients',
    to: '/clients',
    title: 'Clientes',
    description: `${stats.clients ?? 0} activos`,
    icon: FaUsers,
    bg: 'linear-gradient(135deg, #104734ff, #047857)',
    visible: true,
  },
  {
    id: 'pending',
    to: '/pending-tasks',
    title: 'Pendientes',
    description: `${stats.pendings ?? 0} en espera`,
    icon: FaChartPie,
    bg: 'linear-gradient(135deg, #4e1733ff, #db2777)',
    visible: true,
  },
];
