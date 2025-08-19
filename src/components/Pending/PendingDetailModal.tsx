import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { FaUserPlus, FaTag, FaCalendar, FaCheckSquare, FaPaperclip, FaTrash, FaCommentDots } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './PendingDetailModal.module.css';
import { Client, Pending, User } from '../../utils/interfaces';
import { priority, ranks } from '../../utils/enums'; // Asumiendo enums

interface PendingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pending: Pending;
  users: User[];
  onUpdate: (updatedPending: Pending) => void;
  loggedInUserId: string;
  client: string;
  userRank: string;
}

const PendingDetailModal: React.FC<PendingDetailModalProps> = ({ isOpen, onClose, pending, users, onUpdate, loggedInUserId, client, userRank }) => {
  const [localPending, setLocalPending] = useState<Pending>({ ...pending });
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    setLocalPending(pending)
  }, [isOpen]);

  const saveChanges = useCallback(async (field: string, value: any) => {
    setIsSaving(true)
    try {
      const res = await axios.patch(`${process.env.REACT_APP_API_URL}/api/pending/${localPending?._id}`, { [field]: value }, { headers: { Authorization: `Bearer ${token}` } });
      setLocalPending(res.data);
      onUpdate(res.data);

      switch (field) {
        case 'checklist': toast.success('Checklist actualizada')
        break
        case 'comments': toast.success('Comentario enviado');
        break
        case 'priority': toast.success('Prioridad cambiada');
      }
      
      
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
    setNewComment('')
  };

  const handleDeleteCheck = (index: number) => {
    const updatedChecklist = localPending?.checklist?.filter((c, i) => i !== index)
    saveChanges('checklist', updatedChecklist);
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistItem) return;
    const updatedChecklist = [...(localPending?.checklist || []), { action: newChecklistItem, completed: false, creationDate: new Date().toString(), createdBy: loggedInUserId }];
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
            {/* titulo(cliente) */}
            <h1
              className={styles.titleClient}
              >{client} - N° {pending.sequenceNumber} </h1>
            {/* Botones superiores */}
            <div className={styles.buttonBar}>
              <div className={styles.members}>
                {localPending?.userId && <img className={styles.avatar} title={getUserName(localPending?.userId)} src={getUserPicture(localPending?.userId)}/>}
                {localPending?.assignedUserId && <img className={styles.avatar} title={getUserName(localPending?.assignedUserId)} src={getUserPicture(localPending?.assignedUserId)} />}
                {!localPending?.assignedUserId ? (<button title="Asignar Pendiente"><FaUserPlus />Asignar</button>): null}
              </div>
              <button title="Añadir fechas"><FaCalendar /> Fechas</button>
              <button disabled={true} title="Añadir adjunto"><FaPaperclip /> Adjunto</button>

              <select disabled={pending.userId !== loggedInUserId && pending.assignedUserId !== loggedInUserId && userRank !== ranks.TOTALACCESS && userRank !== ranks.CONSULTORCHIEF} value={(Object.entries(priority)[localPending?.priority - 1] ? Object.entries(priority)[localPending?.priority - 1][0] : 5) || 5} className={`${styles.tag} ${styles[`priority${localPending?.priority}`]}`} onChange={(e) => saveChanges('priority', parseInt(e.target.value))}>
                {Object.entries(priority).map(([key, val]) => <option  key={key} value={key}>{val}</option>)}
              </select>
            </div>

            {/* Descripción */}
            <div className={styles.section}>
              <h4>Detalle</h4>
              <textarea
              disabled={pending.userId !== loggedInUserId && pending.assignedUserId !== loggedInUserId && userRank !== ranks.TOTALACCESS && userRank !== ranks.CONSULTORCHIEF}
                value={localPending?.detail || ''}
                onChange={(e) => setLocalPending({ ...localPending, detail: e.target.value })}
                onBlur={() => saveChanges('detail', localPending?.detail)}
                placeholder="Añadir un detalle..."
              />
            </div>

            <div className={styles.section}>
              <h4>Observación</h4>
              <textarea
              disabled={pending.userId !== loggedInUserId && pending.assignedUserId !== loggedInUserId && userRank !== ranks.TOTALACCESS && userRank !== ranks.CONSULTORCHIEF}
                value={localPending?.observation || ''}
                onChange={(e) => setLocalPending({ ...localPending, observation: e.target.value })}
                onBlur={() => saveChanges('observation', localPending?.observation)}
                placeholder="Añadir una observación..."
              />
            </div>

            {/* Checklist */}
            <div className={styles.section}>
              <h4>Checklist</h4>
              <progress value={checklistMemo.filter(c => c.completed).length / checklistMemo.length || 0} max={1} />
              {checklistMemo.map((item, idx) => (
                <div key={idx} className={styles.checklistItem}>
                  <input 
              disabled={pending.userId !== loggedInUserId && pending.assignedUserId !== loggedInUserId && userRank !== ranks.TOTALACCESS && userRank !== ranks.CONSULTORCHIEF}
                  type="checkbox" checked={item.completed} onChange={() => handleToggleChecklist(idx)} />
                  <span className={`${styles.checklistText} ${item.completed ? styles.completed : ''}`}>{item.action}</span>
                  <div className={styles.checklistDates}>

                  {item.createdBy && item.creationDate && <span title={`Creado por ${getUserName(item?.createdBy)}`}>{new Date(item.creationDate).toLocaleString().split(',')[0]}</span>}
                  {item.completed && <span title={`Completado por ${getUserName(item?.completedBy)}`}> | {new Date(item.completionDate).toLocaleString().split(',')[0]}</span>}
                  </div>
                  { userRank === ranks.TOTALACCESS && <button className={styles.deteleButton} onClick={()=> {handleDeleteCheck(idx)}}><FaTrash/></button>}
                </div>
              ))}
              <input
                type="text"
              disabled={pending.userId !== loggedInUserId && pending.assignedUserId !== loggedInUserId && userRank !== ranks.TOTALACCESS && userRank !== ranks.CONSULTORCHIEF}
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Añadir item..."
                className={styles.commentInput}
              />
            </div>    
          </div>

          <div className={styles.rightColumn}>
            <h4>Comentarios</h4>
            <input
            className={styles.commentInput}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Escribe un comentario..."
            />
            <div className={styles.comments}>
              {commentsMemo.map((comm, idx) => (
                ( comm.userId !== loggedInUserId ? 
                <div key={idx} className={styles.comment}>
                  <img className={styles.avatar} title={getUserName(comm?.userId)} src={getUserPicture(comm.userId)} />
                <div className={styles.CommentTextAndDate}>
                  <div className={styles.dateText}>{new Date(comm.date).toLocaleString()}</div>
                  <div className={styles.commentText} >{comm.text}</div>
                  </div>
                </div> 
                : 
              <div key={idx} className={styles.comment}>
                <div className={styles.CommentTextAndDate}>
                  <div className={styles.dateText}>{new Date(comm.date).toLocaleString()}</div>
                  <div className={styles.commentText}>{comm.text}</div>
                </div>
                  <img className={styles.avatar} title={getUserName(comm?.userId)} src={getUserPicture(comm.userId)} />
                </div>
              )
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