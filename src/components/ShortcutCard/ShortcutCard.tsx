import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './ShortcutCard.module.css';

interface Props {
  to: string;
  title: string;
  description: string;
  icon: React.ElementType; // se mantiene el tipo público
  bg: string;
  ariaLabel?: string;      // opcional, no rompe compatibilidad
  className?: string;      // opcional para extensiones locales
}

const ShortcutCard: React.FC<Props> = ({ to, title, description, icon: Icon, bg, ariaLabel, className }) => {
  const label = useMemo(() => ariaLabel ?? `${title}: ${description}`, [ariaLabel, title, description]);
  const dataId = useMemo(() => `shortcut-${title.toLowerCase().replace(/\s+/g, '-')}`, [title]);

  return (
    <Link
      to={to}
      className={[styles.card, className].filter(Boolean).join(' ')}
      // Mantengo compat: asigno background y también --bg para el nuevo CSS
      style={{ background: bg, ['--bg' as any]: bg }}
      aria-label={label}
      role="listitem"
      data-id={dataId}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon />
      </span>
      <span className={styles.info}>
        <h3>{title}</h3>
        <p>{description}</p>
      </span>
    </Link>
  );
};

export default React.memo(ShortcutCard);
