import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, TrendingUp, PiggyBank, CreditCard, Plus, ArrowUpRight, ArrowDownRight, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createTransaction, deleteTransaction } from '@/lib/api';
import { useTransactions } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import { HUES, hueRGB, type HueName } from '@/lib/colors';
import type { TransactionType } from '@/lib/types';

const EXPENSE_CATEGORIES = ['Rent', 'Food & groceries', 'Transport', 'Subscriptions', 'Utilities', 'Shopping', 'Health', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Side projects', 'Business', 'Gift', 'Other'];

const HUE_NAMES = Object.keys(HUES) as HueName[];
function categoryHue(category: string): HueName {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return HUE_NAMES[hash % HUE_NAMES.length];
}

function fmt(n: number) {
  return `KSh ${Math.round(Math.abs(n)).toLocaleString()}`;
}

function pctDelta(curr: number, prev: number): { label: string; up: boolean } | null {
  if (prev <= 0) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
}

function sameMonth(dateStr: string, ref: Date) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export function Finance() {
  const { data: transactions, loading } = useTransactions();
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();
  const list = useMemo(() => transactions ?? [], [transactions]);

  const now = new Date();
  const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const monthTx = useMemo(() => list.filter((t) => sameMonth(t.occurred_on, now)), [list]);
  const prevMonthTx = useMemo(() => list.filter((t) => sameMonth(t.occurred_on, prevMonthRef)), [list]);

  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = totalIncome - totalExpense;
  const prevSavings = prevIncome - prevExpense;
  const subscriptionTx = monthTx.filter((t) => t.type === 'expense' && t.category === 'Subscriptions');
  const subscriptionTotal = subscriptionTx.reduce((s, t) => s + t.amount, 0);

  const breakdown = useMemo(() => {
    const map = new Map<string, { category: string; type: TransactionType; total: number }>();
    monthTx.forEach((t) => {
      const key = `${t.type}:${t.category}`;
      const existing = map.get(key);
      if (existing) existing.total += t.amount;
      else map.set(key, { category: t.category, type: t.type, total: t.amount });
    });
    return [...map.values()]
      .map((row) => ({
        ...row,
        pct: Math.min(100, Math.round((row.total / (row.type === 'income' ? totalIncome : totalExpense || 1)) * 100)),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [monthTx, totalIncome, totalExpense]);

  const recent = useMemo(
    () => [...list].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : a.occurred_on > b.occurred_on ? -1 : a.created_at < b.created_at ? 1 : -1)).slice(0, 8),
    [list],
  );

  async function remove(id: string) {
    await deleteTransaction(id);
    toast.success('Transaction deleted');
  }

  const incomeDelta = pctDelta(totalIncome, prevIncome);
  const expenseDelta = pctDelta(totalExpense, prevExpense);
  const savingsDelta = pctDelta(savings, prevSavings);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Finance</h2>
          <p className="text-sm text-slate-400">Track income, expenses, and financial goals.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> Transaction
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Income" value={fmt(totalIncome)} delta={incomeDelta?.label ?? 'This month'} up={incomeDelta?.up} icon={ArrowUpRight} color="text-emerald-500 bg-emerald-500/10" />
        <SummaryCard label="Expenses" value={fmt(totalExpense)} delta={expenseDelta?.label ?? 'This month'} up={expenseDelta ? !expenseDelta.up : undefined} icon={ArrowDownRight} color="text-rose-500 bg-rose-500/10" />
        <SummaryCard label="Savings" value={fmt(savings)} delta={savingsDelta?.label ?? 'This month'} up={savingsDelta?.up} icon={PiggyBank} color="text-blue-500 bg-blue-500/10" />
        <SummaryCard label="Subscriptions" value={fmt(subscriptionTotal)} delta={`${subscriptionTx.length} this month`} icon={CreditCard} color="text-amber-500 bg-amber-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-accent-500" />
            <h3 className="font-display font-bold">Monthly overview</h3>
          </div>
          {loading && (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 rounded-lg shimmer-bg animate-shimmer" />)}</div>
          )}
          {!loading && breakdown.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No transactions logged this month yet.</p>
          )}
          {!loading && breakdown.length > 0 && (
            <div className="space-y-3">
              {breakdown.map((row) => (
                <div key={`${row.type}:${row.category}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{row.category}</span>
                    <span className="text-slate-400">{fmt(row.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="h-full rounded-full"
                      style={{ background: hueRGB(categoryHue(row.category)) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-accent-500" />
            <h3 className="font-display font-bold">Recent transactions</h3>
          </div>
          {loading && (
            <div className="space-y-1.5">{[...Array(5)].map((_, i) => <div key={i} className="h-11 rounded-lg shimmer-bg animate-shimmer" />)}</div>
          )}
          {!loading && recent.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No transactions yet. Add your first one.</p>
          )}
          {!loading && recent.length > 0 && (
            <div className="space-y-1">
              <AnimatePresence>
                {recent.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 group"
                  >
                    <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.description || t.category}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(t.occurred_on + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })} · {t.category}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                      {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                    </div>
                    <button
                      onClick={() => remove(t.id)}
                      className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <NewTransactionModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function SummaryCard({ label, value, delta, up, icon: Icon, color }: {
  label: string; value: string; delta: string; up?: boolean; icon: LucideIcon; color: string;
}) {
  return (
    <div className="card p-4">
      <div className={`size-9 rounded-xl grid place-items-center mb-3 ${color}`}>
        <Icon size={17} />
      </div>
      <div className="font-display font-bold text-xl">{value}</div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-[10px] ${up === true ? 'text-emerald-500' : up === false ? 'text-rose-500' : 'text-slate-400'}`}>{delta}</span>
      </div>
    </div>
  );
}

function NewTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function setTransactionType(next: TransactionType) {
    setType(next);
    setCategory(next === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  }

  function reset() {
    setType('expense');
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    const { error } = await createTransaction({
      type,
      amount: value,
      category,
      description: description.trim() || null,
      occurred_on: date,
    });
    setSaving(false);
    if (error) { toast.error('Could not save transaction'); return; }
    toast.success('Transaction added');
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="New Transaction" size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setTransactionType('expense')}
            className={`chip justify-center py-2 transition ${type === 'expense' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            <ArrowDownRight size={13} /> Expense
          </button>
          <button
            onClick={() => setTransactionType('income')}
            className={`chip justify-center py-2 transition ${type === 'income' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
          >
            <ArrowUpRight size={13} /> Income
          </button>
        </div>

        <div>
          <div className="label mb-1.5">Amount (KSh)</div>
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1.5">Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="label mb-1.5">Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <div className="label mb-1.5">Description</div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="input" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={() => { reset(); onClose(); }}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !amount}>
            {saving ? 'Saving…' : 'Add transaction'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
