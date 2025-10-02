import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { FaPlus, FaTrash } from 'react-icons/fa';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import type { Budget, BudgetItem, Client } from '../../utils/interfaces';
import { BudgetsAPI } from '../../api/budgets';
import axios from 'axios';
import styles from './BudgetsForm.module.css';

/* ---------- Schema ---------- */
const schema = yup.object({
  clientName: yup.string().trim().required('Cliente requerido').max(200),
  clientId:   yup.string().nullable().optional(), // ← nuevo, no requerido
  validUntil: yup.string().nullable().optional(),
  // Acepta que el input sea texto y lo normaliza (coma/ puntos)
  discountFixed: yup
    .number()
    .transform((val, orig) => {
      const s = String(orig ?? '').replace(/\./g, '').replace(',', '.').trim();
      if (s === '') return 0;
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    })
    .typeError('Debe ser número')
    .min(0, 'No puede ser negativo')
    .default(0)
    .optional(),
  terms: yup.string().max(2000).nullable().optional(),
  notes: yup.string().max(2000).nullable().optional(),
  items: yup.array(
    yup.object({
      description: yup.string().trim().required().max(500),
      qty: yup.number().typeError('Debe ser número').min(0).required(),
      unitPrice: yup.number().typeError('Debe ser número').min(0).required(),
      unit: yup.string().max(50).optional(),
      taxRate: yup.number().min(0).max(1).optional(), // 0..1 (ej: 0.21)
    })
  ).min(1, 'Al menos un ítem').required(),
}).required();

type FormData = yup.InferType<typeof schema>;
type FormItem = FormData['items'][number];

/* ---------- Helpers ---------- */
const toNum = (v: any, d = 0) =>
  typeof v === 'string'
    ? (Number(v.replace?.(',', '.')) || d)
    : (Number.isFinite(Number(v)) ? Number(v) : d);

const normTax = (v?: number | null) => {
  if (v == null || (v as any) === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n; // 21 => 0.21
};

const fmtARS2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------- Component ---------- */
const BudgetForm: React.FC<{ value: Budget | null; onSaved: () => void; }> = ({ value, onSaved }) => {
  const todayLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  const defaults: FormData = value
    ? {
        clientName: value.clientName,
        validUntil: value.validUntil ? value.validUntil.slice(0, 10) : todayLocal(),
        discountFixed: Number((value as any)?.discountFixed ?? 0),
        terms: value.terms ?? '',
        notes: value.notes ?? '',
        items: (value.items as BudgetItem[]).map<FormItem>((i) => ({
          description: i.description ?? '',
          qty: Number(i.qty ?? 0),
          unitPrice: Number(i.unitPrice ?? 0),
          unit: i.unit ?? 'hora',
          taxRate: typeof i.taxRate === 'number' ? i.taxRate : 0.21,
        })),
      }
    : {
        clientName: '',
        validUntil: todayLocal(),
        discountFixed: 0,
        terms: '',
        notes: '',
        items: [{ description: '', qty: 1, unitPrice: 0, unit: 'hora', taxRate: 0.21 }],
      };

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: yupResolver(schema) as any, defaultValues: defaults });

  const { fields, append, remove } = useFieldArray<FormData, 'items'>({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' }) ?? [];

  // ----- Descuento dinámico: observamos el RAW y lo parseamos en memo -----
  const discountFixedRaw = useWatch({ control, name: 'discountFixed' });
  const discountFixed = useMemo(() => {
    const s = String(discountFixedRaw ?? '').replace(/\./g, '').replace(',', '.').trim();
    if (s === '') return 0;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [discountFixedRaw]);

  /* ---------- Typeahead Clientes ---------- */
  const [clientQ, setClientQ] = useState(defaults.clientName);
  const [clientPickedId, setClientPickedId] = useState<string | null>(value?.clientId ?? null);
  const [sug, setSug] = useState<Client[]>([]);
  const [openSug, setOpenSug] = useState(false);

  // Keyboard nav state
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useMemo(() => `client-sug-${Math.random().toString(36).slice(2)}`, []);

  // ---- Sugerencias server-side: LIKE '%q%' sobre name/common ----
  useEffect(() => {
    const q = (clientQ || '').trim();
    if (q.length < 2) { setSug([]); setActiveIdx(-1); return; } // evita spam
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const url = `${process.env.REACT_APP_API_URL}/api/clients/buscar/${encodeURIComponent(q)}?limit=8`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
        const data = res.ok ? await res.json() : [];
        setSug(Array.isArray(data) ? data : []);
        setActiveIdx(0); // primera opción activa por defecto
      } catch {/* abort/network */}
    }, 250); // debounce
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [clientQ]);

  // Mantener visible el ítem activo
  useEffect(() => {
    if (!openSug || activeIdx < 0) return;
    const el = document.getElementById(`${listId}-opt-${activeIdx}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, openSug, listId]);

  const pickClient = (c: Client) => {
    setValue('clientName', c.name);
    setValue('clientId', (c as any)._id);
    setClientPickedId((c as any)._id);
    setClientQ(c.name);
    setOpenSug(false);
    setActiveIdx(-1);
    // inputRef.current?.blur(); // opcional
  };

  /* ---------- T.C. visual (equivalente USD) ---------- */
  const [tc, setTc] = useState<number>(1500);

  /* ---------- Cálculos ---------- */
  const { totalHours, subtotal, tax, total, usdEq } = useMemo(() => {
    const th = items.reduce((acc: number, it: any) => acc + toNum(it?.qty), 0);
    const sub = items.reduce((acc: number, it: any) => acc + toNum(it?.qty) * toNum(it?.unitPrice), 0);
    const tx  = items.reduce((acc: number, it: any) => {
      const rate = normTax(toNum(it?.taxRate));
      return acc + toNum(it?.qty) * toNum(it?.unitPrice) * rate;
    }, 0);

    const tot = Math.max(0, sub + tx - discountFixed);
    return { totalHours: th, subtotal: sub, tax: tx, total: tot, usdEq: tc > 0 ? tot / tc : 0 };
  }, [items, tc, discountFixed]);

  /* ---------- Atajos ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = typeof e.key === 'string' ? e.key.toLowerCase() : '';
      if (!k) return;
      // Ctrl/Cmd + I : nuevo ítem
      const mod = e.ctrlKey || e.metaKey;
      if (mod && k === 'i') {
        e.preventDefault();
        append({ description:'', qty:1, unitPrice:0, unit:'hora', taxRate:0.21 } as FormItem);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [append]);

  /* ---------- Submit ---------- */
  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      clientId: data.clientId || clientPickedId || undefined,
      // Garantía: número limpio hacia el backend
      discountFixed: Math.max(0, discountFixed),
    } as any;
    if (value?._id) await BudgetsAPI.update(value._id, payload);
    else await BudgetsAPI.create(payload);
    onSaved();
  };

  const stopWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.currentTarget as HTMLInputElement).blur();
  const blockExpKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e','E','+','-'].includes(e.key)) e.preventDefault();
  };

  return (
<form className={styles.form} onSubmit={handleSubmit(onSubmit)} aria-label="Formulario de presupuesto">

  {/* Cliente */}
  <div className={styles.section}>
    <label className={styles.field}>
      <span className={styles.label}>Cliente</span>
      <div className={styles.taWrap}>
        <input
          ref={inputRef}
          className={styles.input}
          {...register('clientName')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={openSug}
          aria-controls={listId}
          aria-activedescendant={openSug && activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined}
          onChange={(e) => {
            setValue('clientName', e.target.value);
            setValue('clientId', '');      // si modifican el texto, invalidar selección previa
            setClientPickedId(null);
            setClientQ(e.target.value);
            setOpenSug(true);
          }}
          onFocus={() => { setOpenSug(true); if (sug.length > 0) setActiveIdx((i) => (i < 0 ? 0 : i)); }}
          onBlur={() => setTimeout(() => setOpenSug(false), 150)}
          onKeyDown={(e) => {
            if (!openSug && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              setOpenSug(true);
              setActiveIdx(0);
              return;
            }
            if (!sug.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => (i + 1) % sug.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => (i <= 0 ? sug.length - 1 : i - 1));
            } else if (e.key === 'Enter') {
              if (activeIdx >= 0 && sug[activeIdx]) {
                e.preventDefault();
                pickClient(sug[activeIdx]);
              }
            } else if (e.key === 'Escape') {
              setOpenSug(false);
              setActiveIdx(-1);
            }
          }}
          placeholder="Buscar o escribir cliente..."
        />
        {openSug && sug.length > 0 && (
          <ul id={listId} className={styles.taList} role="listbox">
            {sug.map((c, i) => (
              <li
                id={`${listId}-opt-${i}`}
                key={c._id}
                className={`${styles.taItem} ${i === activeIdx ? styles.taActive : ''}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={() => pickClient(c)} // mousedown para ganar al blur
                title={c.common ? `Común ${c.common}` : c.name}
              >
                <span className={styles.taMain}>{c.name}</span>
                {c.common && <span className={styles.taSec}>· {c.common}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {errors.clientName && <span className={styles.error} role="alert">{errors.clientName.message}</span>}
    </label>

    {/* Fecha + T.C. + Descuento fijo */}
    <div className={`${styles.grid} ${styles.colsHeader}`}>
      <label className={styles.field}>
        <span className={styles.label}>Válido hasta</span>
        <input className={styles.input} type="date" {...register('validUntil')} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>T.C. (ARS/USD)</span>
        <input
          className={styles.input}
          type="text" inputMode="decimal"
          value={String(tc).replace('.', ',')}
          onChange={(e) => {
            const v = e.target.value.replace(/\./g, '').replace(',', '.');
            setTc(Number(v) || 0);
          }}
          placeholder="Ej: 1.500,48"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Descuento fijo (ARS)</span>
        <input
          className={styles.input}
          // Usamos texto + inputMode decimal: mejor UX en AR y recalcula en vivo
          type="text"
          inputMode="decimal"
          placeholder="Ej: 15000"
          {...register('discountFixed')}
          onChange={(e) => {
            // ✅ TS-safe: convertimos a número antes de setValue
            const s = e.target.value ?? '';
            const n = Number(s.replace(/\./g, '').replace(',', '.'));
            setValue('discountFixed', Number.isFinite(n) && n >= 0 ? n : 0, {
              shouldDirty: true, shouldValidate: true, shouldTouch: true
            });
          }}
          onWheel={stopWheel}
          onKeyDown={blockExpKeys}
        />
      </label>
    </div>
  </div>

  {/* Ítems */}
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      <h3 className={styles.itemsTitle}>Ítems</h3>
      <div className={styles.itemsBar}>
        <button
          type="button"
          className={styles.btn}
          onClick={() => append({ description:'', qty:1, unitPrice:0, unit:'hora', taxRate:0.21 } as FormItem)}
          title="Ctrl+I"
        ><span className="icon"><FaPlus /></span>Agregar ítem</button>
      </div>
    </div>

    <table className={styles.itemsTable}>
      <colgroup>
        <col className={styles.cDetail} />
        <col className={styles.cHours} />
        <col className={styles.cRate} />
        <col className={styles.cTax} />
        <col className={styles.cSubtotal} />
        <col className={styles.cActions} />
      </colgroup>
      <thead>
        <tr>
          <th>Detalle</th>
          <th>Horas</th>
          <th>Valor Hora (ARS)</th>
          <th>Impuesto</th>
          <th>Subtotal</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f, idx) => (
          <tr key={f.id}>
            <td>
              <input className={styles.input}
                {...register(`items.${idx}.description` as const)}
                placeholder="p.ej. Desarrollo módulo X"
              />
            </td>
            <td>
              <input className={styles.input}
                type="number" step="0.25" min={0}
                {...register(`items.${idx}.qty` as const, { valueAsNumber: true })}
                onWheel={stopWheel} onKeyDown={blockExpKeys}
              />
            </td>
            <td>
              <input className={styles.input}
                type="number" step="1" min={0}
                {...register(`items.${idx}.unitPrice` as const, { valueAsNumber: true })}
                onWheel={stopWheel} onKeyDown={blockExpKeys}
              />
            </td>
            <td>
              <input className={styles.input}
                type="number" step="0.01" min={0}
                {...register(`items.${idx}.taxRate` as const, { valueAsNumber: true })}
                onWheel={stopWheel} onKeyDown={blockExpKeys}
              />
            </td>
            <td className={styles.subcell} aria-label="Subtotal fila">
              {(
                Number(items?.[idx]?.qty || 0) *
                Number(items?.[idx]?.unitPrice || 0) *
                (1 + Number(items?.[idx]?.taxRate || 0))
              ).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => remove(idx)}
                aria-label={`Eliminar ítem ${idx + 1}`}
                title="Eliminar ítem"
              >
                <FaTrash />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {errors.items && <span className={styles.error} role="alert">{String(errors.items.message)}</span>}
  </div>

  {/* Términos / Notas */}
  <div className={styles.section}>
    <div className={`${styles.grid} ${styles.cols1}`}>
      <label className={`${styles.field} ${styles.full}`}>
        <span className={styles.label}>Términos</span>
        <textarea className={styles.input} {...register('terms')} rows={3} />
      </label>
      <label className={`${styles.field} ${styles.full}`}>
        <span className={styles.label}>Notas</span>
        <textarea className={styles.input} {...register('notes')} rows={3} />
      </label>
    </div>
  </div>

  {/* Totales */}
  <div className={styles.totals} aria-live="polite">
    <div className={styles.pill}>Total de horas: <strong>{fmtARS2.format(totalHours)}</strong></div>
    <div className={styles.pill}>Subtotal (ARS): <strong>{fmtARS2.format(subtotal)}</strong></div>
    <div className={styles.pill}>Descuento (ARS): <strong>{fmtARS2.format(Math.max(0, discountFixed))}</strong></div>
    <div className={styles.pill}>Impuestos (ARS): <strong>{fmtARS2.format(tax)}</strong></div>
    <div className={styles.pill}>Total (ARS): <strong>{fmtARS2.format(total)}</strong></div>
    <div className={styles.pill}>≈ Equivalente USD: <strong>{fmtARS2.format(usdEq)}</strong></div>
  </div>

  <div className={styles.footer}>
    <button className={styles.btn} type="submit" disabled={isSubmitting}>
      {value?._id ? 'Guardar' : 'Crear'}
    </button>
  </div>
</form>
  );
};

export default BudgetForm;
