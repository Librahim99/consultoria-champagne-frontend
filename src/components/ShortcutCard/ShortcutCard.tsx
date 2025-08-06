import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ShortcutCard.module.css';

interface Props {
  to: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bg: string;
}

const ShortcutCard: React.FC<Props> = ({ to, title, description, icon: Icon, bg }) => {
  return (
    <Link to={to} className={styles.card} style={{ background: bg }}>
      <div className={styles.icon}><Icon /></div>
      <div className={styles.info}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
};

export default ShortcutCard;
