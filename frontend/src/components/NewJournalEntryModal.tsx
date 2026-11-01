import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  Calendar,
  Smile,
  Upload,
  CheckCircle2,
  XCircle,
  ImageIcon,
} from 'lucide-react';
import { fetchAccounts } from '../services/api';
import { loadRules } from '../services/rulesStore';

// Imported types directly matching your setup
export type TradeType = 'Buy' | 'Sell';
export type TradeResult = 'Win' | 'Loss' | 'Break Even';
export type Emotion = 'Confident' | 'Calm' | 'Focused' | 'Frustrated' | 'Anxious' | 'Happy';

export type JournalEntry = {
  id: string | number;
  date: string;
  account: string;
  accountId?: string;
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

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entryData: Omit<JournalEntry, 'id'>) => void;
}
type RuleOption = { _id: string; title: string; description?: string; category?: string; isActive?: boolean };


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const NewJournalEntryModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [symbol, setSymbol] = useState('EURUSD');
  const [tradeType, setTradeType] = useState<TradeType>('Buy');
  const [positionSize, setPositionSize] = useState('1.00');
  const [entryPrice, setEntryPrice] = useState('1.08250');
  const [exitPrice, setExitPrice] = useState('1.08500');
  const [result, setResult] = useState<TradeResult>('Win');
  const [profitLoss, setProfitLoss] = useState('250.00');
  const [notes, setNotes] = useState('');
  const [emotion, setEmotion] = useState<Emotion>('Confident');
  const [emotionNotes, setEmotionNotes] = useState('');

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [accounts, setAccounts] = useState<Array<{
    id: string;
    name: string;
    broker?: string;
    accountNumber?: string;
  }>>([]);

  const [account, setAccount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [availableRules, setAvailableRules] = useState<RuleOption[]>([]);

  // Accounts.tsx persists the user's accounts under this key.
  // Refresh the list whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    void loadRules(true).then(setAvailableRules).catch(() => setAvailableRules([]));
    void fetchAccounts().then((accountRes) => {
      const backendAccounts = accountRes.data.data ?? [];
      const mapped = backendAccounts.map((item:any) => ({ id: item._id, name: item.name, broker: item.broker }));
      setAccounts(mapped);
      setAccount(current => current || mapped[0]?.name || '');
      setAccountId(current => current || mapped[0]?.id || '');
    }).catch((error) => {
      console.error('Could not load accounts from SQLite.', error);
      setAccounts([]);
      setAccount('');
      setAccountId('');
    });
  }, [isOpen]);

  const handleAccountChange = (value: string) => {
    const selected = accounts.find(item => item.name === value);
    setAccount(value);
    setAccountId(selected?.id || '');
  };

  const [followedRules, setFollowedRules] = useState<boolean>(true);
  const [brokenRule, setBrokenRule] = useState<string>('');

  const [tradingViewFile, setTradingViewFile] = useState<File | null>(null);
  const [mt5File, setMt5File] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleResultChange = (newResult: TradeResult) => {
    setResult(newResult);
    const numericVal = Math.abs(parseFloat(profitLoss.replace(/[^0-9.]/g, '')) || 0);

    if (newResult === 'Loss') {
      setProfitLoss(`-${numericVal || 150}`);
    } else if (newResult === 'Win') {
      setProfitLoss(`+${numericVal || 250}`);
    } else {
      setProfitLoss('0.00');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let tradingViewUrl: string | undefined = undefined;
    let mt5Url: string | undefined = undefined;

    if (tradingViewFile) {
      tradingViewUrl = await fileToBase64(tradingViewFile);
    }
    if (mt5File) {
      mt5Url = await fileToBase64(mt5File);
    }

    onSave({
      symbol,
      tradeType,
      positionSize,
      entryPrice,
      exitPrice,
      result,
      profitLoss: parseFloat(profitLoss.replace('+', '')),
      notes,
      emotion,
      emotionNotes,
      date,
      account,
      accountId,
      followedRules,
      brokenRule: followedRules ? null : brokenRule,
      rulesFollowedIds: [],
      tradingViewScreenshot: tradingViewUrl,
      mt5Screenshot: mt5Url,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-xl bg-[var(--surface)] shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">New Journal Entry</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Log your trade details, screenshots, and emotions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-xl border border-slate-200/80 bg-[var(--surface)] p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--ink)] font-bold text-sm">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Trade Details</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Symbol
                    </label>
                    <select
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-[var(--surface)] focus:border-blue-500 focus:outline-none"
                    >
                      <option value="EURUSD">EURUSD</option>
                      <option value="GBPUSD">GBPUSD</option>
                      <option value="XAUUSD">XAUUSD (Gold)</option>
                      <option value="US30">US30</option>
                      <option value="BTCUSD">BTCUSD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Trade Type
                    </label>
                    <select
                      value={tradeType}
                      onChange={(e) => setTradeType(e.target.value as TradeType)}
                      className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-[var(--surface)] focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Buy">Buy</option>
                      <option value="Sell">Sell</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Position Size
                    </label>
                    <input
                      type="text"
                      value={positionSize}
                      onChange={(e) => setPositionSize(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="1.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Entry Price
                    </label>
                    <input
                      type="text"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="1.08250"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Exit Price
                    </label>
                    <input
                      type="text"
                      value={exitPrice}
                      onChange={(e) => setExitPrice(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                      placeholder="1.08500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Result
                    </label>
                    <select
                      value={result}
                      onChange={(e) => handleResultChange(e.target.value as TradeResult)}
                      className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-[var(--surface)] focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Win">Win</option>
                      <option value="Loss">Loss</option>
                      <option value="Break Even">Breakeven</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      P/L (USD)
                    </label>
                    <input
                      type="text"
                      disabled={result === 'Break Even'}
                      value={profitLoss}
                      onChange={(e) => setProfitLoss(e.target.value)}
                      className={`w-full h-9 rounded-lg text-xs font-bold px-3 transition-all outline-none ${
                        result === 'Break Even'
                          ? 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : result === 'Loss'
                          ? 'border-2 border-red-500 bg-red-50 text-red-600 shadow-[0_0_10px_rgba(239,68,68,0.25)] focus:ring-2 focus:ring-red-400'
                          : 'border border-emerald-300 bg-emerald-50 text-emerald-600'
                      }`}
                      placeholder={result === 'Loss' ? '-150.00' : '+$250.00'}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Notes / Trade Details
                    </label>
                    <span className="text-[10px] text-slate-400">{notes.length}/500</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe your trade setup, entry reason, exit reason..."
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Screenshots Upload */}
              <div className="rounded-xl border border-slate-200/80 bg-[var(--surface)] p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[var(--ink)] font-bold text-sm">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Trade Screenshots</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center hover:border-blue-400 transition bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700 block mb-1">
                      TradingView Analysis
                    </span>
                    <label className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                      <Upload className="w-5 h-5 text-blue-500" />
                      <span className="text-[11px] text-slate-500 truncate max-w-full px-2">
                        {tradingViewFile ? tradingViewFile.name : 'Click to upload screenshot'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setTradingViewFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center hover:border-blue-400 transition bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-700 block mb-1">
                      MT5 Execution
                    </span>
                    <label className="cursor-pointer flex flex-col items-center justify-center space-y-1">
                      <Upload className="w-5 h-5 text-blue-500" />
                      <span className="text-[11px] text-slate-500 truncate max-w-full px-2">
                        {mt5File ? mt5File.name : 'Click to upload screenshot'}
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

              {/* Emotion Selector */}
              <div className="rounded-xl border border-slate-200/80 bg-[var(--surface)] p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-[var(--ink)] font-bold text-sm">
                  <Smile className="w-4 h-4 text-amber-500" />
                  <span>Emotions During Trade</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['Confident', 'Calm', 'Focused', 'Frustrated', 'Anxious', 'Happy'] as Emotion[]).map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setEmotion(emo)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        emotion === emo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-1 ring-emerald-400'
                          : 'bg-[var(--surface)] text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>

                <div>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={emotionNotes}
                    onChange={(e) => setEmotionNotes(e.target.value)}
                    placeholder="e.g. Felt calm at the entry but got anxious near the final target..."
                    className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200/80 bg-[var(--surface)] p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-[var(--ink)] font-bold text-sm">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Trade Date & Account</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-blue-500 bg-[var(--surface)] px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Trading Account
                  </label>
                  <select
                    value={account}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    disabled={accounts.length === 0}
                    required
                    className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-[var(--surface)] focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {accounts.length === 0 ? (
                      <option value="">No trading accounts available</option>
                    ) : (
                      accounts.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                          {item.broker ? ` — ${item.broker}` : ''}
                          {item.accountNumber ? ` (${item.accountNumber})` : ''}
                        </option>
                      ))
                    )}
                  </select>

                  {accounts.length === 0 && (
                    <p className="mt-1.5 text-[10px] text-amber-600">
                      Add a trading account from the Accounts page first.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-[var(--surface)] p-5 shadow-sm space-y-3">
                <span className="block text-sm font-bold text-[var(--ink)]">
                  Did you follow your rules?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFollowedRules(true)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition ${
                      followedRules === true
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400'
                        : 'bg-[var(--surface)] text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedRules(false)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition ${
                      followedRules === false
                        ? 'bg-rose-50 text-rose-700 border-rose-400'
                        : 'bg-[var(--surface)] text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    No
                  </button>
                </div>


                {!followedRules && (
                  <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
                    <label className="block text-[11px] font-semibold text-rose-600 mb-1.5">
                      Which rule was broken?
                    </label>
                    <select
                      value={brokenRule}
                      onChange={(e) => setBrokenRule(e.target.value)}
                      className="w-full h-9 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    >
                      {availableRules.map((rule) => (
                        <option key={rule._id} value={rule.title}>
                          {rule.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm"
            >
              Save Journal Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};