import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Search,
  Calendar,
  Smile,
  Meh,
  Frown,
  Flame,
  Heart,
  LockKeyhole,
  CircleCheck,
  CircleX,
  X,
  Pencil,
  Trash2,
  Share2,
  Image as ImageIcon,
  Upload,
  Clipboard,
  ChevronDown,
} from 'lucide-react';
import { fetchAccounts, fetchJournalEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../services/api';
import { loadRules } from '../services/rulesStore';
import { TradeCard } from './TradeCard';
import TradeShare from './TradeShare';
import { useDialog } from './ui/DialogProvider';
import { fileToFirestoreDataUrl } from '../services/fileData';

type Emotion = 'Confident' | 'Calm' | 'Focused' | 'Frustrated' | 'Anxious' | 'Happy';
type TradeResult = 'Win' | 'Loss' | 'Break Even';
type TradeType = 'Buy' | 'Sell';

export type JournalEntry = {
  id: string | number;
  date: string;
  account: string;
  accountId?: string;
  accountIds?: string[];
  symbol: string;
  tradeType: TradeType;
  positionSize: string;
  entryPrice: string;
  exitPrice: string;
  result: TradeResult;
  profitLoss: number;
  notes: string;
  emotion: Emotion;
  emotionNotes: string;
  followedRules: boolean;
  brokenRule: string | null;
  rulesFollowedIds?: string[];
  tradingViewScreenshot?: string;
  mt5Screenshot?: string;
};

const emotionOptions = [
  { name: 'Confident' as Emotion, icon: Smile, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', selectedBg: 'bg-emerald-50', selectedBorder: 'border-emerald-400' },
  { name: 'Calm' as Emotion, icon: Meh, iconBg: 'bg-sky-50', iconColor: 'text-sky-600', selectedBg: 'bg-sky-50', selectedBorder: 'border-sky-400' },
  { name: 'Focused' as Emotion, icon: Heart, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', selectedBg: 'bg-purple-50', selectedBorder: 'border-purple-400' },
  { name: 'Frustrated' as Emotion, icon: Frown, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', selectedBg: 'bg-rose-50', selectedBorder: 'border-rose-400' },
  { name: 'Anxious' as Emotion, icon: Flame, iconBg: 'bg-orange-50', iconColor: 'text-orange-600', selectedBg: 'bg-orange-50', selectedBorder: 'border-orange-400' },
  { name: 'Happy' as Emotion, icon: Smile, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', selectedBg: 'bg-amber-50', selectedBorder: 'border-amber-400' },
];

const formatDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="mb-2 block text-[12px] font-medium text-[var(--ink)]">{children}</label>
);

const SelectField: React.FC<{
  value: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ value, onChange, children, icon }) => (
  <div className="relative">
    {icon && <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">{icon}</div>}
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`h-10 w-full appearance-none rounded-md border border-[var(--line-strong)] bg-[var(--surface)] text-[12px] font-medium text-[var(--ink)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${icon ? 'pl-10 pr-9' : 'px-3 pr-9'}`}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink)]" />
  </div>
);

const InputField: React.FC<{
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    placeholder={placeholder}
    className="h-10 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
  />
);

// Details Popout Modal
const EntryDetailsModal: React.FC<{
  entry: JournalEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}> = ({ entry, onClose, onEdit, onDelete, onShare }) => {
  const emotionConfig = emotionOptions.find((e) => e.name === entry.emotion) || emotionOptions[0];
  const EmotionIcon = emotionConfig.icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold text-white ${entry.tradeType === 'Buy' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              {entry.tradeType.toUpperCase()}
            </span>
            <h2 className="text-[20px] font-bold text-[var(--ink)]">{entry.symbol}</h2>
            <span className="text-[12px] font-semibold text-[var(--muted)]">• {formatDate(entry.date)}</span>
            <span className="text-[12px] text-[var(--muted)]">({entry.account})</span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onEdit} className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] font-semibold text-[var(--muted-strong)] transition hover:bg-slate-50">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button type="button" onClick={onShare} className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] font-semibold text-[var(--muted-strong)] transition hover:bg-slate-50">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button type="button" onClick={onDelete} className="flex h-8 items-center gap-1.5 rounded-md bg-rose-50 px-3 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button type="button" onClick={onClose} className="ml-2 text-[var(--muted-strong)] hover:text-[var(--ink)]">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto p-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-4 gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <div>
              <p className="text-[10px] font-medium text-[var(--muted)]">Result</p>
              <p className={`mt-0.5 text-[14px] font-bold ${entry.result === 'Win' ? 'text-emerald-600' : entry.result === 'Loss' ? 'text-rose-600' : 'text-slate-600'}`}>
                {entry.result}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--muted)]">Profit / Loss</p>
              <p className={`mt-0.5 text-[14px] font-bold ${entry.profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {entry.profitLoss >= 0 ? '+' : '-'}${Math.abs(entry.profitLoss).toFixed(2)} USD
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--muted)]">Entry / Exit Price</p>
              <p className="mt-0.5 text-[13px] font-bold text-[var(--ink)]">{entry.entryPrice || '-'} / {entry.exitPrice || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-[var(--muted)]">Position Size</p>
              <p className="mt-0.5 text-[13px] font-bold text-[var(--ink)]">{entry.positionSize || '-'} Lot</p>
            </div>
          </div>

          {/* Screenshots Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--ink)]">
                <ImageIcon className="h-4 w-4 text-blue-600" /> TradingView Screenshot
              </div>
              <div className="relative h-[220px] overflow-hidden rounded-xl border border-[var(--line)] bg-black">
                {entry.tradingViewScreenshot ? (
                  <img src={entry.tradingViewScreenshot} alt="TradingView Chart" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-[11px]">No TradingView screenshot uploaded</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--ink)]">
                <ImageIcon className="h-4 w-4 text-emerald-600" /> MT5 Screenshot
              </div>
              <div className="relative h-[220px] overflow-hidden rounded-xl border border-[var(--line)] bg-black">
                {entry.mt5Screenshot ? (
                  <img src={entry.mt5Screenshot} alt="MT5 Trade Confirmation" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-[11px]">No MT5 screenshot uploaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Emotions & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="mb-2 text-[12px] font-bold text-[var(--ink)]">Emotions Logged</h3>
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${emotionConfig.iconBg}`}>
                  <EmotionIcon className={`h-4 w-4 ${emotionConfig.iconColor}`} />
                </div>
                <span className="text-[13px] font-semibold text-[var(--ink)]">{entry.emotion}</span>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[var(--muted-strong)]">
                {entry.emotionNotes || 'No additional emotion notes written for this trade.'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="mb-2 text-[12px] font-bold text-[var(--ink)]">Rules Adherence</h3>
              <div className="flex items-center gap-2">
                {entry.followedRules ? (
                  <>
                    <CircleCheck className="h-5 w-5 text-emerald-500" />
                    <span className="text-[12px] font-bold text-emerald-600">Followed all rules</span>
                  </>
                ) : (
                  <>
                    <CircleX className="h-5 w-5 text-rose-500" />
                    <span className="text-[12px] font-bold text-rose-600">Rule Broken: {entry.brokenRule || 'Rule violated'}</span>
                  </>
                )}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[var(--muted-strong)]">
                {entry.followedRules ? 'Executed strictly according to strategy and risk parameters.' : 'Deviated from standard plan.'}
              </p>
            </div>
          </div>

          {/* Detailed Trade Notes */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="mb-2 text-[12px] font-bold text-[var(--ink)]">Trade Notes / Analysis</h3>
            <p className="text-[12px] leading-relaxed text-[var(--muted-strong)]">
              {entry.notes || 'No trade analysis provided.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal for Creating & Editing Entries
export type JournalEntryModalProps = {
  initialEntry?: JournalEntry | null;
  onClose: () => void;
  onSaved?: () => void;
};

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({ initialEntry, onClose, onSaved }) => {
  const dialog = useDialog();
  const [selectedDate, setSelectedDate] = useState(initialEntry?.date || new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState(initialEntry?.account || '');
  const [accountId, setAccountId] = useState(initialEntry?.accountId || '');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialEntry?.accountIds || (initialEntry?.accountId ? [initialEntry.accountId] : []));
  const [accounts, setAccounts] = useState<{_id:string;name:string}[]>([]);
  const [availableRules, setAvailableRules] = useState<{_id:string;title:string;description?:string;category?:string}[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>(initialEntry?.rulesFollowedIds || []);
  const [symbol, setSymbol] = useState(initialEntry?.symbol || 'EURUSD');
  const [tradeType, setTradeType] = useState<TradeType>(initialEntry?.tradeType || 'Buy');
  const [positionSize, setPositionSize] = useState(initialEntry?.positionSize || '1.00');
  const [entryPrice, setEntryPrice] = useState(initialEntry?.entryPrice || '1.08250');
  const [exitPrice, setExitPrice] = useState(initialEntry?.exitPrice || '1.08500');
  const [result, setResult] = useState<TradeResult>(initialEntry?.result || 'Win');
  const [notes, setNotes] = useState(initialEntry?.notes || '');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>(initialEntry?.emotion || 'Confident');
  const [emotionNotes, setEmotionNotes] = useState(initialEntry?.emotionNotes || '');
  const [followedRules, setFollowedRules] = useState(initialEntry ? initialEntry.followedRules : true);
  const [brokenRule, setBrokenRule] = useState(initialEntry?.brokenRule || '');
  
  const [tradingViewFile, setTradingViewFile] = useState<File | null>(null);
  const [mt5File, setMt5File] = useState<File | null>(null);

  useEffect(() => {
    Promise.all([fetchAccounts(), loadRules(true)]).then(([accountsRes, rules]) => {
      const accountData = accountsRes.data.data ?? [];
      const ruleData = rules ?? [];
      setAccounts(accountData);
      setAvailableRules(ruleData);
      if (!account && accountData.length) {
        setAccount(accountData[0].name);
        setAccountId(accountData[0]._id);
        setSelectedAccountIds(current => current.length ? current : [accountData[0]._id]);
      } else if (account) {
        const selected = accountData.find((item:any) => item.name === account);
        if (selected) { setAccountId(selected._id); setSelectedAccountIds(current => current.length ? current : [selected._id]); }
      }
    }).catch(() => {});
  }, []);

  const handlePasteImage = (e: React.ClipboardEvent, target: 'tv' | 'mt5') => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          if (target === 'tv') {
            setTradingViewFile(file);
          } else {
            setMt5File(file);
          }
          e.preventDefault();
          break;
        }
      }
    }
  };

  const calculatedPL = useMemo(() => {
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const size = Number(positionSize);
    if (!Number.isFinite(entry) || !Number.isFinite(exit) || !Number.isFinite(size) || entry <= 0 || exit <= 0 || size <= 0) return 0;
    const difference = tradeType === 'Buy' ? exit - entry : entry - exit;
    return difference * size * 100000;
  }, [entryPrice, exitPrice, positionSize, tradeType]);

  const handleSave = async () => {
    if (selectedAccountIds.length === 0) { dialog.toast('error', 'Select an account', 'Choose at least one account where you took this trade.'); return; }
    let tradingViewUrl = initialEntry?.tradingViewScreenshot;
    let mt5Url = initialEntry?.mt5Screenshot;
    if (tradingViewFile) tradingViewUrl = await fileToFirestoreDataUrl(tradingViewFile, 300_000);
    if (mt5File) mt5Url = await fileToFirestoreDataUrl(mt5File, 300_000);

    const payload = {
      symbol,
      tradeType,
      positionSize: Number(positionSize),
      entryPrice: Number(entryPrice),
      exitPrice: exitPrice ? Number(exitPrice) : undefined,
      result,
      netPL: result === 'Loss' && calculatedPL > 0 ? -calculatedPL : result === 'Break Even' ? 0 : calculatedPL,
      notes,
      emotions: [selectedEmotion],
      emotionNotes,
      account: selectedAccountIds[0] || accountId || undefined,
      accountIds: selectedAccountIds,
      accountName: accounts.filter(a => selectedAccountIds.includes(a._id)).map(a => a.name).join(', '),
      rulesFollowed: selectedRuleIds,
      brokenRule: followedRules ? undefined : brokenRule || undefined,
      tradeDate: selectedDate,
      chartUrl: tradingViewUrl,
      mt5Screenshot: mt5Url,
    };

    try {
      if (initialEntry) await updateJournalEntry(String(initialEntry.id), payload);
      else await createJournalEntry(payload);
      window.dispatchEvent(new Event('journalEntriesUpdated'));
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Could not save journal entry to Firebase.', error);
      dialog.toast('error', 'Could not save the entry', 'Check that Firebase is configured and that you are signed in, then try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-2 sm:p-6 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex max-h-[92dvh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4">
          <div>
            <h2 className="text-[22px] font-bold text-[var(--ink)]">{initialEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">Log your trade details, screenshots, and emotions.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted-strong)] hover:bg-slate-100 hover:text-[var(--ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-4">
            <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_3px_rgba(20,50,90,.04)] space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50"><LockKeyhole className="h-4 w-4 text-blue-600" /></div>
                <h3 className="text-[15px] font-bold text-[var(--ink)]">Trade Details</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                <div className="col-span-2 sm:col-span-1"><FieldLabel>Accounts for this trade</FieldLabel><div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-[var(--line-strong)] p-2">{accounts.length ? accounts.map(a=><label key={a._id} className="flex items-center gap-2 text-xs text-[var(--muted-strong)]"><input type="checkbox" checked={selectedAccountIds.includes(a._id)} onChange={e=>{setSelectedAccountIds(ids=>e.target.checked?[...ids,a._id]:ids.filter(id=>id!==a._id)); if(e.target.checked){setAccount(a.name);setAccountId(a._id);} else if(accountId===a._id){const next=accounts.find(x=>selectedAccountIds.includes(x._id)&&x._id!==a._id);setAccount(next?.name||'');setAccountId(next?._id||'');}}}/>{a.name}</label>) : <span className="text-xs text-[var(--muted)]">Add accounts first.</span>}</div></div>
                <div><FieldLabel>Symbol</FieldLabel><SelectField value={symbol} onChange={setSymbol}><option>EURUSD</option><option>GBPUSD</option><option>XAUUSD</option><option>NAS100</option><option>US30</option></SelectField></div>
                <div><FieldLabel>Trade Type</FieldLabel><SelectField value={tradeType} onChange={(v) => setTradeType(v as TradeType)}><option>Buy</option><option>Sell</option></SelectField></div>
                <div><FieldLabel>Position Size</FieldLabel><InputField value={positionSize} onChange={setPositionSize} type="number" /></div>
                <div><FieldLabel>Entry Price</FieldLabel><InputField value={entryPrice} onChange={setEntryPrice} /></div>
              </div>

              <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-3">
                <div><FieldLabel>Exit Price</FieldLabel><InputField value={exitPrice} onChange={setExitPrice} /></div>
                <div><FieldLabel>Result</FieldLabel><SelectField value={result} onChange={(v) => setResult(v as TradeResult)}><option>Win</option><option>Loss</option><option>Break Even</option></SelectField></div>
                <div><FieldLabel>P/L (USD)</FieldLabel><div className={`flex h-10 items-center rounded-md border px-3 text-[13px] font-semibold ${calculatedPL >= 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-500' : 'border-rose-200 bg-rose-50 text-rose-500'}`}>{calculatedPL >= 0 ? '+' : '-'}${Math.abs(calculatedPL).toFixed(2)}</div></div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between"><FieldLabel>Notes / Trade Details</FieldLabel><span className="text-[9px] text-[var(--muted)]">{notes.length}/500</span></div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} className="h-[80px] w-full resize-none rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-[11px] leading-5 text-[var(--muted-strong)] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Describe trade setup, reasons..." />
              </div>

              {/* Screenshots Upload & Paste Component */}
              <div className="rounded-xl border border-slate-200/80 bg-[var(--surface)] p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[var(--ink)] font-bold text-xs">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Trade Screenshots (Upload or Paste)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    tabIndex={0}
                    onPaste={(e) => handlePasteImage(e, 'tv')}
                    className="group border-2 border-dashed border-slate-200 rounded-lg p-3 text-center transition bg-slate-50/50 hover:border-blue-400 focus:border-blue-500 focus:bg-blue-50/20 outline-none"
                  >
                    <span className="text-xs font-semibold text-slate-700 block mb-1">
                      TradingView Analysis
                    </span>
                    <label className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-500">
                        <Upload className="w-4 h-4" />
                        <Clipboard className="w-3.5 h-3.5 opacity-70" />
                      </div>
                      <span className="text-[11px] text-slate-500 truncate max-w-full px-2">
                        {tradingViewFile ? tradingViewFile.name : 'Upload your analysis'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setTradingViewFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div 
                    tabIndex={0}
                    onPaste={(e) => handlePasteImage(e, 'mt5')}
                    className="group border-2 border-dashed border-slate-200 rounded-lg p-3 text-center transition bg-slate-50/50 hover:border-blue-400 focus:border-blue-500 focus:bg-blue-50/20 outline-none"
                  >
                    <span className="text-xs font-semibold text-slate-700 block mb-1">
                      MT5 Execution
                    </span>
                    <label className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-500">
                        <Upload className="w-4 h-4" />
                        <Clipboard className="w-3.5 h-3.5 opacity-70" />
                      </div>
                      <span className="text-[11px] text-slate-500 truncate max-w-full px-2">
                        {mt5File ? mt5File.name : 'Upload your MT5'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setMt5File(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
                <div className="mb-3 flex items-center gap-2"><Smile className="h-5 w-5 text-orange-500" /><h3 className="text-[13px] font-bold text-[var(--ink)]">Emotions During Trade</h3></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
                  {emotionOptions.map((emotion) => {
                    const Icon = emotion.icon;
                    const selected = selectedEmotion === emotion.name;
                    return <button key={emotion.name} type="button" onClick={() => setSelectedEmotion(emotion.name)} className={`flex h-9 items-center justify-center gap-2 rounded-md border text-[10px] font-medium transition ${selected ? `${emotion.selectedBg} ${emotion.selectedBorder}${emotion.iconColor}` : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-blue-300'}`}><span className={`flex h-5 w-5 items-center justify-center rounded-full ${emotion.iconBg}`}><Icon className={`h-3 w-3 ${emotion.iconColor}`} /></span>{emotion.name}</button>;
                  })}
                </div>
                <div className="mt-3"><textarea value={emotionNotes} onChange={(e) => setEmotionNotes(e.target.value.slice(0, 200))} className="h-[55px] w-full resize-none rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-2.5 text-[10px] text-[var(--muted-strong)] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" placeholder="Additional emotion notes..." /></div>
              </div>
            </section>

            <div className="space-y-4">
              <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-[var(--ink)]" /><h3 className="text-[13px] font-bold text-[var(--ink)]">Trade Date & Account</h3></div>
                <FieldLabel>Date</FieldLabel>
                <InputField value={selectedDate} onChange={setSelectedDate} type="date" />
                <div className="mt-3"><FieldLabel>Accounts included ({selectedAccountIds.length})</FieldLabel><p className="mb-2 text-[10px] text-[var(--muted)]">Select every account where you took this same trade. P/L is applied to each selected account.</p><div className="max-h-36 space-y-2 overflow-y-auto">{accounts.map(a=><label key={a._id} className="flex items-center gap-2 rounded-md border border-[var(--line)] px-2.5 py-2 text-xs"><input type="checkbox" checked={selectedAccountIds.includes(a._id)} onChange={e=>{setSelectedAccountIds(ids=>e.target.checked?[...ids,a._id]:ids.filter(id=>id!==a._id));if(e.target.checked){setAccount(a.name);setAccountId(a._id);}else if(accountId===a._id){const next=accounts.find(x=>selectedAccountIds.includes(x._id)&&x._id!==a._id);setAccount(next?.name||'');setAccountId(next?._id||'');}}}/>{a.name}</label>)}</div></div>
              </section>

              <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--ink)]" /><h3 className="text-[13px] font-bold text-[var(--ink)]">Did you follow your rules?</h3></div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setFollowedRules(true); setBrokenRule(''); }} className={`flex h-10 items-center justify-center gap-2 rounded-md border text-[10px] font-semibold ${followedRules ? 'border-emerald-300 bg-emerald-50 text-emerald-500' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'}`}><CircleCheck className="h-4 w-4" />Yes</button>
                  <button type="button" onClick={() => setFollowedRules(false)} className={`flex h-10 items-center justify-center gap-2 rounded-md border text-[10px] font-semibold ${!followedRules ? 'border-rose-300 bg-rose-50 text-rose-500' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'}`}><CircleX className="h-4 w-4" />No</button>
                </div>
                <div className="mt-3 space-y-2">
                  <FieldLabel>Rules used for this trade</FieldLabel>
                  {availableRules.length === 0 ? <p className="text-[10px] text-[var(--muted)]">No active rules yet. Add rules from the Rules page.</p> : availableRules.map(rule => <label key={rule._id} className="flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-[10px] text-[var(--muted-strong)]"><input type="checkbox" checked={selectedRuleIds.includes(rule._id)} onChange={e=>setSelectedRuleIds(ids=>e.target.checked?[...ids,rule._id]:ids.filter(id=>id!==rule._id))}/><span>{rule.title}</span></label>)}
                </div>
                {!followedRules && <div className="mt-3"><FieldLabel>Which rule did you break?</FieldLabel><SelectField value={brokenRule} onChange={setBrokenRule}><option value="">Select a rule</option>{availableRules.map(rule=><option key={rule._id} value={rule.title}>{rule.title}</option>)}</SelectField></div>}
              </section>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] bg-[var(--surface)] px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-7 text-[11px] font-medium text-[var(--muted-strong)] hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleSave} className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-7 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700"><BookOpen className="h-4 w-4" />Save Journal Entry</button>
        </div>
      </div>
    </div>
  );
};


export const Journal: React.FC = () => { 
  const dialog = useDialog();
  const [entries, setEntries] = useState<JournalEntry[]>([]); 
  const [resultFilter, setResultFilter] = useState<'All' | TradeResult>('All');
  const [search, setSearch] = useState('');
  
  // Modals state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [selectedDetailsEntry, setSelectedDetailsEntry] = useState<JournalEntry | null>(null);
  const [sharingEntry, setSharingEntry] = useState<JournalEntry | null>(null);

  const refreshEntries = async () => {
    try {
      const res = await fetchJournalEntries();
      const data = res.data.data ?? [];
      setEntries(data.map((e:any) => ({
        id: e._id,
        date: e.tradeDate ? new Date(e.tradeDate).toISOString().split('T')[0] : '',
        account: e.accountName || e.account?.name || '',
        accountId: e.account?._id || (typeof e.account === 'string' ? e.account : undefined),
        accountIds: e.accountIds || (e.account?._id ? [e.account._id] : []),
        symbol: e.symbol,
        tradeType: e.tradeType,
        positionSize: String(e.positionSize ?? ''),
        entryPrice: String(e.entryPrice ?? ''),
        exitPrice: String(e.exitPrice ?? ''),
        result: e.result,
        profitLoss: Number(e.netPL) || 0,
        notes: e.notes || '',
        emotion: (e.emotions?.[0] || 'Calm') as Emotion,
        emotionNotes: e.emotionNotes || '',
        followedRules: !e.brokenRule,
        brokenRule: e.brokenRule || null,
        rulesFollowedIds: (e.rulesFollowed || []).map((r:any)=>typeof r==='string'?r:r._id),
        tradingViewScreenshot: e.chartUrl,
        mt5Screenshot: e.mt5Screenshot,
      })));
    } catch (error) {
      console.error('Could not load journal entries from Firebase.', error);
      setEntries([]);
    }
  };

  useEffect(() => {
    void refreshEntries();
    window.addEventListener('journalEntriesUpdated', refreshEntries);
    return () => window.removeEventListener('journalEntriesUpdated', refreshEntries);
  }, []);

  const handleDelete = async (id: string | number) => {
    const target = entries.find((e) => e.id === id);
    const label = target ? `${target.symbol}${target.date ? ` from ${formatDate(target.date)}` : ''}` : 'this entry';
    const confirmed = await dialog.confirm({
      title: 'Delete this journal entry?',
      message: `The ${label} trade will be removed from your journal. This can't be undone.`,
      confirmLabel: 'Delete entry',
      tone: 'danger',
      icon: <Trash2 className="h-5 w-5" strokeWidth={1.9} />,
    });
    if (!confirmed) return;

    try {
      await deleteJournalEntry(id);
      setEntries(current => current.filter(e => e.id !== id));
    } catch (error) {
      console.error('Could not delete journal entry from Firebase.', error);
      dialog.toast('error', 'Could not delete the entry', 'Check that Firebase is configured and that you are signed in, then try again.');
      return;
    }
    dialog.toast('success', 'Entry deleted');
    window.dispatchEvent(new Event('journalEntriesUpdated'));
    if (selectedDetailsEntry?.id === id) setSelectedDetailsEntry(null);
  };

  const totals = useMemo(
    () => ({
      wins: entries.filter((e) => e.result === 'Win').length,
      losses: entries.filter((e) => e.result === 'Loss').length,
    }),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((entry) => {
        const matchesSearch =
          !q || entry.symbol.toLowerCase().includes(q) || (entry.notes || '').toLowerCase().includes(q);
        const matchesResult = resultFilter === 'All' || entry.result === resultFilter;
        return matchesSearch && matchesResult;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  }, [entries, resultFilter, search]);

  const filters: { label: string; value: 'All' | TradeResult }[] = [
    { label: 'All', value: 'All' },
    { label: 'TP', value: 'Win' },
    { label: 'SL', value: 'Loss' },
    { label: 'BE', value: 'Break Even' },
  ];

  return (
    <div className="text-[var(--ink)]">
      <main>
        <div className="app-page">
          <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="eyebrow">All trades</div>
              <h1 className="page-title mt-3">Journal</h1>
              <p className="page-sub">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {totals.wins} {totals.wins === 1 ? 'win' : 'wins'} · {totals.losses} {totals.losses === 1 ? 'loss' : 'losses'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pair or setup"
                  aria-label="Search pair or setup"
                  className="h-10 w-[240px] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 text-[13px] outline-none focus:border-[var(--ink)]"
                />
              </label>
              <div className="seg" role="group" aria-label="Filter by result">
                {filters.map((f) => (
                  <button key={f.label} type="button" aria-pressed={resultFilter === f.value} onClick={() => setResultFilter(f.value)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {filteredEntries.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
              {filteredEntries.map((entry, index) => (
                <TradeCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  showMeta
                  onOpen={() => setSelectedDetailsEntry(entry)}
                  onEdit={(e) => {
                    e.stopPropagation();
                    setEditingEntry(entry);
                    setShowEntryModal(true);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    void handleDelete(entry.id);
                  }}
                  onShare={(e) => {
                    e.stopPropagation();
                    setSharingEntry(entry);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="card px-6 py-16 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-[var(--line-strong)]" />
              <p className="mt-3 text-[14px] font-semibold text-[var(--muted-strong)]">
                {entries.length ? 'No entries match' : 'No journal entries yet'}
              </p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {entries.length ? 'Try a different search or result filter.' : 'Use New Entry to log your first trade.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detailed Entry Viewer Popup */}
      {selectedDetailsEntry && (
        <EntryDetailsModal
          entry={selectedDetailsEntry}
          onClose={() => setSelectedDetailsEntry(null)}
          onEdit={() => {
            setEditingEntry(selectedDetailsEntry);
            setSelectedDetailsEntry(null);
            setShowEntryModal(true);
          }}
          onDelete={() => handleDelete(selectedDetailsEntry.id)}
          onShare={() => { setSharingEntry(selectedDetailsEntry); setSelectedDetailsEntry(null); }}
        />
      )}

      {sharingEntry && (
        <TradeShare
          entry={sharingEntry}
          onClose={() => setSharingEntry(null)}
        />
      )}

      {/* New / Edit Journal Entry Modal */}
      {showEntryModal && (
        <JournalEntryModal
          initialEntry={editingEntry}
          onClose={() => {
            setShowEntryModal(false);
            setEditingEntry(null);
          }}
          onSaved={() => {
            refreshEntries();
            setShowEntryModal(false);
            setEditingEntry(null);
          }}
        />
      )}
    </div> 
  ); 
};

export default Journal;