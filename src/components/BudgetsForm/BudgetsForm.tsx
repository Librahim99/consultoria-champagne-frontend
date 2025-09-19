import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import type { Budget, BudgetItem, Client } from '../../utils/interfaces';
import { BudgetsAPI } from '../../api/budgets';
import axios from 'axios';
import styles from './BudgetsForm.module.css';

/* ---------- Schema ---------- */
const schema = yup.object({
  clientName: yup.string().trim().required('Cliente requerido').max(200),
  validUntil: yup.string().nullable().optional(),
  terms: yup.string().max(2000).nullable().optional(),
  notes: yup.string().max(2000).nullable().optional(),
  items: yup.array(
    yup.object({
      description: yup.string().trim().required().max(500),
      qty: yup.number().typeError('Debe ser número').min(0).required(),        // horas
      unitPrice: yup.number().typeError('Debe ser número').min(0).required(),  // valor hora ARS
      unit: yup.string().max(50).optional(),
      taxRate: yup.number().min(0).max(1).optional(),                           // 0..1 (ej: 0.21)
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

const fmtARS2 = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ---------- Component ---------- */
const BudgetForm: React.FC<{ value: Budget | null; onSaved: () => void; }> = ({ value, onSaved }) => {
  const defaults: FormData = value
    ? {
        clientName: value.clientName,
        validUntil: value.validUntil ? value.validUntil.slice(0, 10) : '',
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
        validUntil: '',
        terms: '',
        notes: '',
        items: [{ description: '', qty: 1, unitPrice: 0, unit: 'hora', taxRate: 0.21 }],
      };

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: yupResolver(schema) as any, defaultValues: defaults });

  const { fields, append, remove } = useFieldArray<FormData, 'items'>({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' }) ?? [];

  /* ---------- Typeahead Clientes ---------- */
  const [clientQ, setClientQ] = useState(defaults.clientName);
  const [sug, setSug] = useState<Client[]>([]);
  const [openSug, setOpenSug] = useState(false);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(async () => {
      const q = clientQ.trim().toLowerCase();
      if (!q) { setSug([]); return; }
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get<Client[]>(
          `${process.env.REACT_APP_API_URL}/api/clients`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const list = res.data
          .filter(c =>
            c.name?.toLowerCase().includes(q) ||
            String(c.common ?? '').toLowerCase().includes(q)
          )
          .slice(0, 8);
        if (!cancel) setSug(list);
      } catch { /* noop */ }
    }, 200);
    return () => { cancel = true; clearTimeout(t); };
  }, [clientQ]);

  /* ---------- T.C. visual (equivalente USD) ---------- */
  const [tc, setTc] = useState<number>(1500);

  /* ---------- Cálculos memoizados ---------- */
  const { totalHours, subtotal, tax, total, usdEq } = useMemo(() => {
    const th = items.reduce((acc: number, it: any) => acc + toNum(it?.qty), 0);
    const sub = items.reduce((acc: number, it: any) => acc + toNum(it?.qty) * toNum(it?.unitPrice), 0);
    const tx  = items.reduce((acc: number, it: any) => {
      const rate = normTax(toNum(it?.taxRate));
      return acc + toNum(it?.qty) * toNum(it?.unitPrice) * rate;
    }, 0);
    const tot = sub + tx;
    return { totalHours: th, subtotal: sub, tax: tx, total: tot, usdEq: tc > 0 ? tot / tc : 0 };
  }, [items, tc]);

  /* ---------- Atajos ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        append({ description:'', qty:1, unitPrice:0, unit:'hora', taxRate:0.21 } as FormItem);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        append({ description:'Descuento', qty:1, unitPrice:-1, unit:'', taxRate:0 } as FormItem);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [append]);

  /* ---------- Submit ---------- */
  const onSubmit = async (data: FormData) => {
    // No enviamos currency: backend asume ARS.
    if (value?._id) await BudgetsAPI.update(value._id, data as any);
    else await BudgetsAPI.create(data as any);
    onSaved();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} aria-label="Formulario de presupuesto">
      {/* Cliente + typeahead */}
      <label className={styles.full}>
        Cliente
        <div className={styles.taWrap}>
          <input
            {...register('clientName')}
            onChange={(e) => { setValue('clientName', e.target.value); setClientQ(e.target.value); setOpenSug(true); }}
            onFocus={() => setOpenSug(true)}
            onBlur={() => setTimeout(() => setOpenSug(false), 150)}
            placeholder="Buscar o escribir cliente..."
          />
          {openSug && sug.length > 0 && (
            <ul className={styles.taList} role="listbox">
              {sug.map(c => (
                <li
                  key={c._id}
                  className={styles.taItem}
                  role="option"
                  onMouseDown={() => { setValue('clientName', c.name); setClientQ(c.name); setOpenSug(false); }}
                  title={c.common ? `Común ${c.common}` : c.name}
                >
                  <span className={styles.taMain}>{c.name}</span>
                  {c.common && <span className={styles.taSec}>· {c.common}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {errors.clientName && <span role="alert">{errors.clientName.message}</span>}
      </label>

      <div className={styles.grid}>
        <label>Válido hasta <input type="date" {...register('validUntil')} /></label>

        {/* T.C. (solo para equivalente USD visual) */}
        <label>T.C. (ARS/USD)
          <input
            type="text" inputMode="decimal"
            value={String(tc).replace('.', ',')}
            onChange={(e) => {
              const v = e.target.value.replace(/\./g, '').replace(',', '.');
              setTc(Number(v) || 0);
            }}
            placeholder="Ej: 1.500,48"
          />
        </label>
      </div>

      <h3 className={styles.itemsTitle}>Ítems</h3>
      <div className={styles.itemsBar}>
        <button
          type="button"
          onClick={() => append({ description:'', qty:1, unitPrice:0, unit:'hora', taxRate:0.21 } as FormItem)}
          title="Ctrl+I"
        >+ Agregar ítem</button>
        <button
          type="button"
          onClick={() => append({ description:'Descuento', qty:1, unitPrice:-1, unit:'', taxRate:0 } as FormItem)}
          title="Ctrl+D"
        >– Descuento</button>
      </div>

      <table className={styles.items}>
        <thead>
          <tr>
            <th>Detalle</th><th>Horas</th><th>Valor Hora (ARS)</th><th>Impuesto</th><th>Subtotal</th><th></th>
          </tr>
           <colgroup>
    <col className={styles.cDetail} />
    <col className={styles.cHours} />
    <col className={styles.cRate} />
    <col className={styles.cTax} />
    <col className={styles.cSubtotal} />
    <col className={styles.cActions} />
  </colgroup>
        </thead>
        <tbody>
          {fields.map((f, idx) => (
            <tr key={f.id}>
              <td>
                <input
                  {...register(`items.${idx}.description` as const)}
                  placeholder="p.ej. Desarrollo módulo X"
                />
              </td>

              <td>
                <input
                  type="text" inputMode="decimal"
                  {...register(`items.${idx}.qty` as const)}
                  onBlur={(e) => {
                    const n = toNum(e.target.value);
                    setValue(`items.${idx}.qty`, n as any, { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </td>

              <td>
                <input
                  type="text" inputMode="decimal"
                  {...register(`items.${idx}.unitPrice` as const)}
                  onBlur={(e) => {
                    const n = toNum(e.target.value);
                    setValue(`items.${idx}.unitPrice`, n as any, { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </td>

              <td>
                <input
                  type="text" inputMode="decimal"
                  {...register(`items.${idx}.taxRate` as const)}
                  title="Ingresá 0.21 para 21% (o 21 y se normaliza)"
                  onBlur={(e) => {
                    const n = normTax(toNum(e.target.value));
                    setValue(`items.${idx}.taxRate`, n as any, { shouldDirty: true, shouldValidate: true });
                  }}
                />
              </td>

              <td aria-label="Subtotal fila">
                {(() => {
                  const q  = toNum(items?.[idx]?.qty);
                  const uh = toNum(items?.[idx]?.unitPrice);
                  const tr = normTax(toNum(items?.[idx]?.taxRate));
                  return fmtARS2.format(q * uh * (1 + tr));
                })()}
              </td>

              <td>
                <button type="button" onClick={() => remove(idx)} aria-label={`Eliminar ítem ${idx + 1}`}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {errors.items && <span role="alert">{errors.items.message as string}</span>}

      <div className={styles.notes}>
        <label className={styles.full}>Términos <textarea {...register('terms')} rows={3} /></label>
        <label className={styles.full}>Notas <textarea {...register('notes')} rows={3} /></label>
      </div>

      <div className={styles.totals} aria-live="polite">
        <div>Total de horas: <strong>{fmtARS2.format(totalHours)}</strong></div>
        <div>Subtotal (ARS): <strong>{fmtARS2.format(subtotal)}</strong></div>
        <div>Impuestos (ARS): <strong>{fmtARS2.format(tax)}</strong></div>
        <div>Total (ARS): <strong>{fmtARS2.format(total)}</strong></div>
        <div>≈ Equivalente USD: <strong>{fmtARS2.format(usdEq)}</strong></div>
      </div>

      <div className={styles.footer}>
        <button type="submit" disabled={isSubmitting}>{value?._id ? 'Guardar' : 'Crear'}</button>
      </div>
    </form>
  );
};

export default BudgetForm;
