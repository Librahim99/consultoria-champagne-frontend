import React from 'react';
import styles from './BudgetStatusBadge.module.css';
import type { BudgetStatus } from '../../utils/interfaces';
import { BUDGET_STATUS_LABELS } from '../../utils/interfaces';

const CLASS_MAP: Record<BudgetStatus, string> = {
  DRAFT: styles.draft,
  IN_REVIEW: styles.inReview,
  APPROVED: styles.approved,
  REJECTED: styles.rejected,
  SENT: styles.sent,
  ACCEPTED: styles.accepted,
  LOST: styles.lost,
  EXPIRED: styles.expired,
};

const BudgetStatusBadge: React.FC<{ status: BudgetStatus }> = ({ status }) => {
  const label = BUDGET_STATUS_LABELS[status] ?? status;
  return <span className={`${styles.badge} ${CLASS_MAP[status]}`}>{label}</span>;
};

export default BudgetStatusBadge;
