import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Page } from '../types/navigation';
import { fetchAccounts, fetchJournalEntries, fetchNoTradeDays, saveNoTradeDay, deleteNoTradeDay } from '../services/api';
import { formatMoney } from './TradeCard';

type Props = { onNavigate: (page: Page) => void };

type Entry = {
  _id: string;
  symbol?: string;
  accountName?: string;
  accountIds?: string[];
  account?: { _id?: string; name?: string };
  tradeDate: string;
  netPL: number;
  result: string;
  emotions?: string[];
};
type Account = { _id: string; name: string; broker?: string };
type Status = 'win' | 'loss' | 'be';
type NoTradeDay = { _id: string; tradeDate: string; notes?: string }; 

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const normalizeResult = (result: string = '') => {
  const value = result.trim().toUpperCase();
  if (['TP', 'WIN', 'WON', 'PROFIT'].includes(value)) return 'TP';
  if (['SL', 'LOSS', 'LOST', 'STOP LOSS'].includes(value)) return 'SL';
  if (['BE', 'BREAK EVEN', 'BREAK-EVEN'].includes(value)) return 'BE';
  return value;
};

const statusOf = (pnl: number): Status => (pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'be');
const toneOf = (pnl: number) => (pnl > 0 ? 'text-win' : pnl < 0 ? 'text-loss' : 'text-flat');

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const Calendar: React.FC<Props> = ({ onNavigate }) => {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [account, setAccount] = useState('All');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [noTradeDays, setNoTradeDays] = useState<NoTradeDay[]>([]);
  const [noTradeNotes, setNoTradeNotes] = useState('');
  const [noTradeSaving, setNoTradeSaving] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  useEffect(() => {
    const load = async () => {
      try {
        const [a, j, n] = await Promise.all([fetchAccounts(), fetchJournalEntries(), fetchNoTradeDays()]);
        setAccounts(a.data.data ?? []);
        setEntries(j.data.data ?? []);
        setNoTradeDays(n.data.data ?? []);
      } catch (error) {
        console.error('Could not load calendar data.', error);
      } finally {
        setLoading(false);
      }
    };
    void load();
    window.addEventListener('journalEntriesUpdated', load);
    return () => window.removeEventListener('journalEntriesUpdated', load);
  }, []);

  const filteredEntries = useMemo(() => {
    if (account === 'All') return entries;
    const chosen = accounts.find((a) => a._id === account);
    if (!chosen) return entries;
    return entries.filter((e) => e.account?._id === chosen._id || e.accountIds?.includes(chosen._id) || e.accountName === chosen.name);
  }, [entries, accounts, account]);

  const perDay = useMemo(() => {
    const map: Record<string, { pnl: number; entries: Entry[] }> = {};
    filteredEntries.forEach((e) => {
      const k = key(new Date(e.tradeDate));
      if (!map[k]) map[k] = { pnl: 0, entries: [] };
      map[k].pnl += Number(e.netPL) || 0;
      map[k].entries.push(e);
    });
    return map;
  }, [filteredEntries]);

  const month_ = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    const days = Object.entries(perDay).filter(([k]) => k.startsWith(prefix));
    return {
      pnl: days.reduce((sum, [, d]) => sum + d.pnl, 0),
      tradingDays: days.length,
      green: days.filter(([, d]) => d.pnl > 0).length,
    };
  }, [perDay, year, month]);

  const cells = useMemo(() => {
    const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const total = new Date(year, month + 1, 0).getDate();
    const list: (Date | null)[] = Array(leading).fill(null);
    for (let d = 1; d <= total; d++) list.push(new Date(year, month, d));
    while (list.length % 7) list.push(null);
    return list;
  }, [year, month]);

  const move = (delta: number) => {
    setCursor(new Date(year, month + delta, 1));
    setSelected(null);
  };

  const selectedData = selected ? perDay[selected] : undefined;
  const noTradeByDay = useMemo(() => new Map(noTradeDays.map(d => [key(new Date(d.tradeDate)), d])), [noTradeDays]);
  const selectedNoTrade = selected ? noTradeByDay.get(selected) : undefined;
  const saveNoTrade = async () => { if (!selected) return; setNoTradeSaving(true); try { const response = await saveNoTradeDay({ tradeDate: selected, notes: noTradeNotes }); setNoTradeDays(current => [...current.filter(d => key(new Date(d.tradeDate)) !== selected), response.data.data]); setNoTradeNotes(''); } catch (error) { console.error('Could not save no-trade day', error); window.alert('Could not save this day. Make sure the Firebase is configured and you are signed in.'); } finally { setNoTradeSaving(false); } };

  return (
    <main>
      <div className="app-page">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="eyebrow">Activity</div>
            <h1 className="page-title mt-3">
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <p className="page-sub">
              <span className={`mono font-semibold ${toneOf(month_.pnl)}`}>{formatMoney(month_.pnl)}</span>
              {' · '}
              {loading ? 'Loading…' : `${month_.tradingDays} trading ${month_.tradingDays === 1 ? 'day' : 'days'} · ${month_.green} green`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {accounts.length > 0 && (
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                aria-label="Filter by account"
                className="h-10 min-w-44 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 text-[13px] outline-none focus:border-[var(--ink)]"
              >
                <option value="All">All accounts</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="icon-btn" onClick={() => move(-1)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className="icon-btn" onClick={() => move(1)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="card overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[var(--surface-2)]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="mono py-2.5 text-center text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {cells.map((d, i) => {
                const rowStart = i % 7 === 0;
                const base = `min-h-[96px] border-b border-[var(--line)] ${rowStart ? '' : 'border-l'}`;
                if (!d) return <div key={i} className={`${base} bg-[var(--surface)]`} />;

                const k = key(d);
                const data = perDay[k];
                const status = data ? statusOf(data.pnl) : undefined;
                const noTrade = noTradeByDay.has(k);
                const isSelected = selected === k;

                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : k)}
                    data-status={status}
                    aria-pressed={isSelected}
                    className={`cal-cell ${base} bg-[var(--surface)] p-2 sm:p-3 text-left hover:brightness-[0.98] ${
                      isSelected ? 'outline outline-2 -outline-offset-2 outline-[var(--ink)]' : ''
                    }`}
                  >
                    <div className="text-[13px] font-medium text-[var(--ink)]">{d.getDate()}</div>
                    {noTrade && !data && <div className="mt-2 rounded px-1 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 sm:text-[10px]">NO TRADE</div>}
                    {data && (
                      <div className="mt-3">
                        <div className={`mono text-[15px] font-bold ${toneOf(data.pnl)}`}>{formatMoney(data.pnl)}</div>
                        <div className="mt-1 text-[11px] text-[var(--muted)]">
                          {data.entries.length} {data.entries.length === 1 ? 'trade' : 'trades'}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {selected && (
          <section className="card mt-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Selected day</div>
                <h2 className="mt-1.5 text-[18px] font-bold text-[var(--ink)]">
                  {new Date(`${selected}T00:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2"><button type="button" className="btn-ghost" onClick={() => onNavigate('Journal')}>Open journal</button>{selectedNoTrade && <button type="button" className="btn-ghost" onClick={async()=>{try{await deleteNoTradeDay(selectedNoTrade._id);setNoTradeDays(current=>current.filter(d=>d._id!==selectedNoTrade._id));}catch{window.alert('Could not remove no-trade marker.');}}}>Remove no-trade marker</button>}</div>
            </div>

            {!selectedNoTrade && <div className="mt-4 rounded-lg border border-dashed border-[var(--line-strong)] p-3"><label className="mb-2 block text-xs font-semibold text-[var(--ink)]">No-trade day note (optional)</label><textarea value={noTradeNotes} onChange={e=>setNoTradeNotes(e.target.value)} rows={2} placeholder="e.g. No valid setup, stayed disciplined" className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2 text-sm text-[var(--ink)]"/><button type="button" disabled={noTradeSaving} onClick={()=>void saveNoTrade()} className="btn-primary mt-2 disabled:opacity-50">{noTradeSaving?'Saving…':'Save no-trade day'}</button></div>}
            {selectedNoTrade && <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">Marked as a no-trade day. {selectedNoTrade.notes || 'No note added.'}</p>}
            {selectedData ? (
              <ul className="mt-4 divide-y divide-[var(--line-soft)]">
                {selectedData.entries.map((e) => {
                  const result = normalizeResult(e.result);
                  const pnl = Number(e.netPL) || 0;
                  return (
                    <li key={e._id} className="flex items-center gap-3 py-3">
                      <span className="mono w-24 truncate text-[14px] font-bold text-[var(--ink)]">{e.symbol ?? 'Trade'}</span>
                      <span className={`chip ${result === 'TP' ? 'chip-tp' : result === 'SL' ? 'chip-sl' : 'chip-be'}`}>
                        {result || e.result}
                      </span>
                      <span className="hidden truncate text-[13px] text-[var(--muted)] sm:block">
                        {e.accountName || e.account?.name || ''}
                      </span>
                      <span className={`mono ml-auto text-[14px] font-bold ${toneOf(pnl)}`}>{formatMoney(pnl)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-[14px] text-[var(--muted)]">No trade entries for this day.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default Calendar;
