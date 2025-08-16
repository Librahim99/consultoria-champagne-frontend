import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { FaUserPlus, FaTag, FaCalendar, FaCheckSquare, FaPaperclip, FaTrash, FaCommentDots } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './PendingDetailModal.module.css';
import { Pending, User } from '../../utils/interfaces';
import { priority } from '../../utils/enums'; // Asumiendo enums

interface PendingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pending: Pending;
  users: User[];
  onUpdate: (updatedPending: Pending) => void;
  loggedInUserId: string;
}

const PendingDetailModal: React.FC<PendingDetailModalProps> = ({ isOpen, onClose, pending, users, onUpdate, loggedInUserId }) => {
  const [localPending, setLocalPending] = useState<Pending>({ ...pending });
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token');
//   console.log(pending)

  useEffect(() => {
    setLocalPending(pending)
  }, [isOpen]);

  const saveChanges = useCallback(async (field: string, value: any) => {
    setIsSaving(true);
    try {
      const res = await axios.patch(`${process.env.REACT_APP_API_URL}/api/pendings/${localPending?._id}`, { [field]: value }, { headers: { Authorization: `Bearer ${token}` } });
      setLocalPending(res.data);
      onUpdate(res.data);
      toast.success('Cambios guardados');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  }, [localPending?._id, onUpdate, token]);

  const handleAddComment = () => {
    if (!newComment) return;
    const updatedComments = [...(localPending?.comments || []), { text: newComment, userId: loggedInUserId, date: new Date() }];
    saveChanges('comments', updatedComments);
    setNewComment('');
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem) return;
    const updatedChecklist = [...(localPending?.checklist || []), { action: newChecklistItem, completed: false }];
    saveChanges('checklist', updatedChecklist);
    setNewChecklistItem('');
  };

  const handleToggleChecklist = (index: number) => {
    const updatedChecklist = [...(localPending?.checklist || [])];
    updatedChecklist[index].completed = !updatedChecklist[index].completed;
    updatedChecklist[index].completionDate = new Date().toString();
    updatedChecklist[index].completedBy = loggedInUserId;
    saveChanges('checklist', updatedChecklist);
  };

  const getUserName = (userId: string) => users.find(u => u._id === userId)?.name || 'Desconocido';
  const getUserPicture = (userId: string) => users.find(u => u._id === userId)?.picture || null;

  const getPriorityLabel = (pri: number) => Object.entries(priority)[pri -1]?.[1] || 'SIN PRIORIDAD';

  // Memo para optimización
  const checklistMemo = useMemo(() => localPending?.checklist || [], [localPending?.checklist]);
  const commentsMemo = useMemo(() => localPending?.comments || [], [localPending?.comments]);

  // Close handlers
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div className={styles.modalWrapper} ref={modalRef}>
        <div className={styles.modalContent}>
          <div className={styles.leftColumn}>
            {/* Título editable */}
            <input
              type="text"
              value={localPending?.detail}
              onChange={(e) => setLocalPending({ ...localPending, detail: e.target.value })}
              onBlur={() => saveChanges('detail', localPending?.detail)}
              className={styles.titleInput}
              disabled={isSaving}
            />

            {/* Botones superiores */}
            <div className={styles.buttonBar}>
              <button title="Añadir miembro"><FaUserPlus /> + Añadir</button>
              <button title="Añadir fechas"><FaCalendar /> Fechas</button>
              <button title="Añadir checklist" onClick={() => setNewChecklistItem('Nuevo item')}><FaCheckSquare /> Checklist</button>
              <button title="Añadir adjunto"><FaPaperclip /> Adjunto</button>
            </div>

            {/* Miembros */}
            <div className={styles.section}>
              <h4>Miembros</h4>
              <div className={styles.members}>
                {localPending?.userId && <img className={styles.avatar} title={getUserName(localPending?.userId)} src={getUserPicture(localPending?.userId)}/>}
                {localPending?.assignedUserId && <div className={styles.avatar} title={getUserName(localPending?.assignedUserId)}>{getUserName(localPending?.assignedUserId)[0]}</div>}
                {!localPending?.assignedUserId ? (<button onClick={() => {/* Lógica assign */}}>+</button>): null}
              </div>
            </div>

            {/* Etiquetas (Prioridad) */}
            <div className={styles.section}>
              <h4>Prioridad</h4>
              <div className={`${styles.tag} ${styles[`priority${localPending?.priority}`]}`}>
                {getPriorityLabel(localPending?.priority)}
              </div>
              <select onChange={(e) => saveChanges('priority', parseInt(e.target.value))}>
                {Object.entries(priority).map(([key, val]) => <option  key={key} value={key}>{val}</option>)}
              </select>
            </div>

            {/* Descripción */}
            <div className={styles.section}>
              <h4>Descripción</h4>
              <textarea
                value={localPending?.observation || ''}
                onChange={(e) => setLocalPending({ ...localPending, observation: e.target.value })}
                onBlur={() => saveChanges('observation', localPending?.observation)}
                placeholder="Añadir una descripción más detallada..."
              />
            </div>

            {/* Checklist */}
            <div className={styles.section}>
              <h4>Checklist</h4>
              <progress value={checklistMemo.filter(c => c.completed).length / checklistMemo.length || 0} max={1} />
              {checklistMemo.map((item, idx) => (
                <div key={idx} className={styles.checklistItem}>
                  <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklist(idx)} />
                  {item.action}
                  {item.completed && ` (Completado por ${getUserName(item.completedBy)} el ${new Date(item.completionDate).toLocaleString()})`}
                </div>
              ))}
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Añadir item..."
              />
            </div>

            {/* Botón eliminar */}
            <button className={styles.deleteButton} onClick={() => {/* Lógica delete con confirm */}}><FaTrash /> Eliminar</button>
          </div>

          <div className={styles.rightColumn}>
            {/* Comentarios y Actividad */}
            <h4>Comentarios y Actividad</h4>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Escribe un comentario..."
            />
            <div className={styles.comments}>
              {commentsMemo.map((comm, idx) => (
                <div key={idx} className={styles.comment}>
                  <div className={styles.avatar}>{getUserName(comm.userId)[0]}</div>
                  <div>{comm.text} - {new Date(comm.date).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PendingDetailModal;