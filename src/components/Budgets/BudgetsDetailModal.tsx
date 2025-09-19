import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import styles from './BudgetsDetailModal.module.css';

type ModalSize = 'md' | 'lg' | 'xl' | 'full';

interface Props {
  isOpen: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;          // Botones a la derecha del header
  footer?: React.ReactNode;           // Contenido del footer sticky (opcional)
  size?: ModalSize;                   // md | lg | xl | full
  initialFocusSelector?: string;      // para enfocar un control específico
  closeOnBackdrop?: boolean;          // click fuera cierra (default: true)
  onClose: () => void;
  children: React.ReactNode;
}

const BudgetsDetailModal: React.FC<Props> = ({
  isOpen,
  title,
  subtitle,
  actions,
  footer,
  size = 'lg',
  initialFocusSelector,
  closeOnBackdrop = true,
  onClose,
  children,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`budget-modal-${Math.random().toString(36).slice(2)}`).current;
  const subtitleId = useRef(`budget-modal-sub-${Math.random().toString(36).slice(2)}`).current;

  // Bloquear scroll del body mientras esté abierto
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // ESC y focus trap
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && wrapperRef.current) {
        const focusables = wrapperRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first || !wrapperRef.current.contains(active)) {
            e.preventDefault(); last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault(); first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Autofocus inicial
  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;
    const target = initialFocusSelector
      ? wrapperRef.current.querySelector<HTMLElement>(initialFocusSelector)
      : wrapperRef.current.querySelector<HTMLElement>('input,select,textarea,button,[tabindex]:not([tabindex="-1"])');
    setTimeout(() => target?.focus(), 0);
  }, [isOpen, initialFocusSelector]);

  if (!isOpen) return null;

  const modal = (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={wrapperRef}
        className={`${styles.modalWrapper} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        <header className={styles.header}>
          <div className={styles.titles}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {subtitle && <div id={subtitleId} className={styles.subtitle}>{subtitle}</div>}
          </div>
          <div className={styles.headerActions}>
            {actions}
            <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">×</button>
          </div>
        </header>

        <div ref={contentRef} className={styles.content}>
          {/* Fades top/bottom para indicar scroll */}
          <div className={styles.fadeTop} aria-hidden />
          {children}
          <div className={styles.fadeBottom} aria-hidden />
        </div>

        {footer && (
          <footer className={styles.footer}>
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default BudgetsDetailModal;
