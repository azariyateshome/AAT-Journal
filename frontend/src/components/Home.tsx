import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

import type { Page } from '../types/navigation';
import { fetchJournalEntries } from '../services/api';
import type { JournalEntry } from './Journal';
import { TradeCard, formatMoney, resultKind } from './TradeCard';
import Logo from './layout/Logo';

type Range = '7d' | '30d' | '90d' | '1y';
const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
const RANGES = Object.keys(RANGE_DAYS) as Range[];

const emotionMeta = [
  { name: 'Confident', color: 'bg-emerald-500' },
  { name: 'Calm', color: 'bg-sky-500' },
  { name: 'Focused', color: 'bg-purple-500' },
  { name: 'Frustrated', color: 'bg-rose-500' },
  { name: 'Anxious', color: 'bg-orange-500' },
  { name: 'Happy', color: 'bg-amber-400' },
];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const mapApiEntry = (e: any): JournalEntry => ({
  id: e._id,
  date: e.tradeDate ? new Date(e.tradeDate).toISOString().split('T')[0] : '',
  account: e.accountName || e.account?.name || '',
  accountId: e.account?._id || (typeof e.account === 'string' ? e.account : undefined),
  symbol: e.symbol,
  tradeType: e.tradeType,
  positionSize: String(e.positionSize ?? ''),
  entryPrice: String(e.entryPrice ?? ''),
  exitPrice: String(e.exitPrice ?? ''),
  result: e.result,
  profitLoss: Number(e.netPL) || 0,
  notes: e.notes || '',
  emotion: e.emotions?.[0] || 'Calm',
  emotionNotes: e.emotionNotes || '',
  followedRules: !e.brokenRule,
  brokenRule: e.brokenRule || null,
  rulesFollowedIds: (e.rulesFollowed || []).map((r: any) => (typeof r === 'string' ? r : r._id)),
  tradingViewScreenshot: e.chartUrl,
  mt5Screenshot: e.mt5Screenshot,
});

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const byDateDesc = (a: JournalEntry, b: JournalEntry) =>
  b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id));

/* ---------------------------------------------------------------- */

const Stat: React.FC<{ label: string; value: string; note: string; tone?: 'win' | 'loss' }> = ({
  label,
  value,
  note,
  tone,
}) => (
  <div className="stat-cell">
    <div className="eyebrow">{label}</div>
    <div className="stat-value">{value}</div>
    <div className={`mt-2 text-[13px] ${tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : 'text-[var(--muted)]'}`}>
      {note}
    </div>
  </div>
);

const MonthCalendar: React.FC<{ entries: JournalEntry[]; onOpen: () => void }> = ({ entries, onOpen }) => {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const perDay = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number }>();
    entries.forEach((entry) => {
      if (!entry.date) return;
      const current = map.get(entry.date) ?? { pnl: 0, count: 0 };
      map.set(entry.date, { pnl: current.pnl + entry.profitLoss, count: current.count + 1 });
    });
    return map;
  }, [entries]);

  const cells = useMemo(() => {
    const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const total = new Date(year, month + 1, 0).getDate();
    const list: (number | null)[] = Array(leading).fill(null);
    for (let d = 1; d <= total; d++) list.push(d);
    while (list.length % 7) list.push(null);
    return list;
  }, [year, month]);

  const todayKey = toKey(new Date());

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[17px] font-bold text-[var(--ink)]">
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center gap-1.5">
          <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className="icon-btn !h-8 !w-8" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mono mb-2 grid grid-cols-7 text-center text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="h-[62px]" />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const data = perDay.get(key);
          const status = data ? (data.pnl > 0 ? 'win' : data.pnl < 0 ? 'loss' : 'be') : undefined;
          return (
            <button
              key={i}
              type="button"
              onClick={onOpen}
              data-status={status}
              className={`cal-cell flex h-[62px] flex-col items-start justify-between rounded-lg border p-2 text-left ${
                key === todayKey ? 'border-[var(--ink)]' : 'border-[var(--line-soft)]'
              } hover:border-[var(--line-strong)]`}
            >
              <span className="text-[12px] font-medium text-[var(--ink)]">{day}</span>
              {data && (
                <span className={`mono text-[11px] font-semibold ${data.pnl > 0 ? 'text-win' : data.pnl < 0 ? 'text-loss' : 'text-flat'}`}>
                  {formatMoney(data.pnl)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- */

export type HomeProps = {
  onNavigate: (page: Page) => void;
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [range, setRange] = useState<Range>('30d');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchJournalEntries();
        setEntries((res.data.data ?? []).map(mapApiEntry));
      } catch (error) {
        console.error('Could not load dashboard.', error);
        setEntries([]);
      }
    };
    void load();
    window.addEventListener('journalEntriesUpdated', load);
    return () => window.removeEventListener('journalEntriesUpdated', load);
  }, []);

  const recent = useMemo(() => [...entries].sort(byDateDesc).slice(0, 6), [entries]);

  const stats = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
    const cutoffKey = toKey(cutoff);

    const scoped = entries.filter((e) => e.date && e.date >= cutoffKey);
    const wins = scoped.filter((e) => resultKind(e) === 'win');
    const losses = scoped.filter((e) => resultKind(e) === 'loss');
    const decided = wins.length + losses.length;
    const net = scoped.reduce((sum, e) => sum + e.profitLoss, 0);

    const avgWin = wins.length ? wins.reduce((s, e) => s + e.profitLoss, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, e) => s + e.profitLoss, 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : null;

    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    [...scoped]
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))
      .forEach((e) => {
        equity += e.profitLoss;
        peak = Math.max(peak, equity);
        maxDrawdown = Math.max(maxDrawdown, peak - equity);
      });

    return {
      count: scoped.length,
      net,
      winRate: decided ? (wins.length / decided) * 100 : null,
      wins: wins.length,
      decided,
      rr,
      maxDrawdown,
    };
  }, [entries, range]);

  const emotions = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      if (e.emotion) counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    });
    return emotionMeta.map((item) => ({
      ...item,
      percentage: entries.length ? Math.round(((counts[item.name] || 0) / entries.length) * 100) : 0,
    }));
  }, [entries]);

  const netFormatted = stats.net === 0 ? '$0' : `${stats.net > 0 ? '+' : '-'}$${Math.abs(Math.round(stats.net)).toLocaleString('en-US')}`;

  return (
    <main>
      <div className="app-page space-y-10">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex items-center gap-5">
            <Logo className="home-logo" />
            <div>
              <div className="eyebrow">{greeting()}, Azariya</div>
              <h1 className="page-title mt-3">Performance review</h1>
              <p className="page-sub">Your trading process, results, and mindset in one clear view.</p>
            </div>
          </div>

          <div className="seg" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </header>

        <section className="stat-strip" aria-label="Performance summary">
          <Stat
            label="Net P&L"
            value={netFormatted}
            note={`${stats.count} trade${stats.count === 1 ? '' : 's'} · last ${range}`}
            tone={stats.net > 0 ? 'win' : stats.net < 0 ? 'loss' : undefined}
          />
          <Stat
            label="Win rate"
            value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`}
            note={`${stats.wins} of ${stats.decided} decided`}
          />
          <Stat label="Avg R:R" value={stats.rr === null ? '—' : stats.rr.toFixed(1)} note="Reward / risk ratio" />
          <Stat
            label="Max DD"
            value={stats.maxDrawdown === 0 ? '$0' : `-$${Math.round(stats.maxDrawdown).toLocaleString('en-US')}`}
            note="Peak to trough"
          />
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[19px] font-bold text-[var(--ink)]">Recent journal entries</h2>
              <p className="mt-1 text-[14px] text-[var(--muted)]">Chart, setup and outcome at a glance</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('Journal')}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)] hover:opacity-70"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <p className="text-[15px] font-semibold text-[var(--ink)]">No journal entries yet</p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">Use New Entry to log your first trade.</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
              {recent.map((entry, index) => (
                <TradeCard key={entry.id} entry={entry} index={index} onOpen={() => onNavigate('Journal')} />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <MonthCalendar entries={entries} onOpen={() => onNavigate('Calendar')} />

          <section className="card p-5">
            <h3 className="text-[17px] font-bold text-[var(--ink)]">Emotions</h3>
            <p className="mt-1 text-[13px] text-[var(--muted)]">How you felt across all entries</p>
            <ul className="mt-5 space-y-3.5">
              {emotions.map((item) => (
                <li key={item.name} className="flex items-center gap-3">
                  <span className="w-[76px] text-[13px] text-[var(--muted-strong)]">{item.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="mono w-9 text-right text-[12px] text-[var(--muted)]">{item.percentage}%</span>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </div>
    </main>
  );
};

export default Home;
