import { motion } from 'framer-motion';
import { Wallet, TrendingUp, PiggyBank, CreditCard, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function Finance() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Finance</h2>
          <p className="text-sm text-slate-400">Track income, expenses, and financial goals.</p>
        </div>
        <button className="btn-primary"><Plus size={16} /> Transaction</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Income" value="KSh 248,000" delta="+12%" up icon={ArrowUpRight} color="text-emerald-500 bg-emerald-500/10" />
        <SummaryCard label="Expenses" value="KSh 142,300" delta="+4%" up={false} icon={ArrowDownRight} color="text-rose-500 bg-rose-500/10" />
        <SummaryCard label="Savings" value="KSh 105,700" delta="+18%" up icon={PiggyBank} color="text-blue-500 bg-blue-500/10" />
        <SummaryCard label="Subscriptions" value="KSh 8,400" delta="3 active" icon={CreditCard} color="text-amber-500 bg-amber-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-accent-500" />
            <h3 className="font-display font-semibold">Monthly overview</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Salary', amount: 220000, pct: 88, color: 'bg-emerald-500' },
              { label: 'Side projects', amount: 28000, pct: 12, color: 'bg-blue-500' },
              { label: 'Rent', amount: 45000, pct: 32, color: 'bg-rose-500' },
              { label: 'Food & groceries', amount: 38000, pct: 27, color: 'bg-amber-500' },
              { label: 'Transport', amount: 18000, pct: 13, color: 'bg-cyan-500' },
              { label: 'Subscriptions', amount: 8400, pct: 6, color: 'bg-violet-500' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-slate-400">KSh {row.amount.toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${row.pct}%` }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className={`h-full rounded-full ${row.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-accent-500" />
            <h3 className="font-display font-semibold">Recent transactions</h3>
          </div>
          <div className="space-y-1">
            {[
              { name: 'Salary — Acme Ltd', amount: 220000, date: 'Jul 1', income: true },
              { name: 'Rent', amount: -45000, date: 'Jul 3', income: false },
              { name: 'Groceries — Naivas', amount: -8200, date: 'Jul 5', income: false },
              { name: 'PoaBiz client payment', amount: 28000, date: 'Jul 8', income: true },
              { name: 'Spotify + Netflix', amount: -2400, date: 'Jul 10', income: false },
              { name: 'Fuel', amount: -6500, date: 'Jul 12', income: false },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div className={`size-8 rounded-lg grid place-items-center ${t.income ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {t.income ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.date}</div>
                </div>
                <div className={`text-sm font-semibold ${t.income ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {t.income ? '+' : ''}KSh {Math.abs(t.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
