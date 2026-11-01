import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Plus,
  MoreVertical,
  WalletCards,
  BarChart3 as ChartIcon,
  PieChart,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Image as ImageIcon,
  CircleDollarSign,
  Target,
  Activity,
  Trophy,
  Upload,
  Trash2,
} from "lucide-react";

import { type JournalEntry } from "./Journal";
import { fetchJournalEntries, fetchAccounts, createAccount, updateAccount, deleteAccount } from "../services/api";
import { propFirms } from "../data/propFirms";
import { brokers, findProvider } from "../data/brokers";
import { useDialog } from "./ui/DialogProvider";

type FundedStage = "Phase 1" | "Phase 2" | "Funded";

type JournalMetrics = {
  totalTrades: number;
  winsCount: number;
  lossesCount: number;
  breakEvenCount: number;
  totalLoss: number;
  maxLoss: number;
  maxWin: number;
  avgLoss: number;
  avgWin: number;
  bestPair: string;
  netProfit: number;
  winRate: number;
  profitFactor: number;
};

type Account = {
  id: string | number;
  name: string;
  broker: string;
  type: "Demo" | "Live" | "Funded";
  accountStatus: "Active" | "Passed" | "Breached";
  fundedStage?: FundedStage;
  targetProfit?: number;
  initialBalance: number;
  balance: number;
  equity: number;
  change: number;
  changeAmount: number;
  rr: string;
  color: string;
  accountNumber: string;
  server: string;
  platform: string;
  leverage: string;
  currency: string;
  logo?: string;
  logoName?: string;
  notes?: string;
  _id?: string;
};

/* Shrinks an uploaded logo to a small data URL so the account document
   stays far below Firestore's 1 MiB limit. */
const fileToLogoDataUrl = (file: File, maxSize = 160): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare the logo image."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL("image/png");
      resolve(png.length <= 150_000 ? png : canvas.toDataURL("image/jpeg", 0.8));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the logo image."));
    };
    image.src = url;
  });

/* Firestore writes wait for the server and can hang silently (no database,
   offline, blocked network). This turns a silent hang into a visible error. */
const withTimeout = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

/* =========================================================
   ACCOUNT LOGO
========================================================= */

const AccountLogo = ({ account, size = "normal" }: { account: Account; size?: "small" | "normal" }) => {
  const dimension = size === "small" ? "h-8 w-8" : "h-9 w-9";
  const logo = account.logo || findProvider(account.broker)?.logo;
  if (logo) {
    return <div className={`${dimension} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--ink)] bg-[var(--ink)]`}>
      <img src={logo} alt={account.logoName || account.broker} className="h-full w-full object-contain p-1" />
    </div>;
  }
  return <div className={`${dimension} flex shrink-0 items-center justify-center rounded-full text-white`} style={{ backgroundColor: account.color || "var(--ink)" }}>
    <span className="text-[13px] font-bold">{account.broker?.slice(0, 2).toUpperCase() || "AC"}</span>
  </div>;
};

/* =========================================================
   MINI CHART
========================================================= */

const MiniLineChart = ({
  positive = true,
}: {
  positive?: boolean;
}) => (
  <svg
    viewBox="0 0 120 50"
    className="h-[48px] w-[100px]"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient
        id={`area-${positive ? "up" : "down"}`}
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="0%"
          stopColor={positive ? "var(--success)" : "var(--danger)"}
          stopOpacity="0.18"
        />
        <stop
          offset="100%"
          stopColor={positive ? "var(--success)" : "var(--danger)"}
          stopOpacity="0"
        />
      </linearGradient>
    </defs>

    <path
      d={
        positive
          ? "M0 40 C10 37 12 42 20 32 C28 25 33 35 42 27 C50 19 54 30 63 20 C72 12 78 24 86 17 C96 8 103 15 120 3 L120 50 L0 50 Z"
          : "M0 5 C10 15 15 12 24 23 C32 32 37 21 46 29 C56 38 62 27 70 35 C80 42 87 35 96 42 C106 48 113 44 120 48 L120 50 L0 50 Z"
      }
      fill={`url(#area-${positive ? "up" : "down"})`}
    />

    <path
      d={
        positive
          ? "M0 40 C10 37 12 42 20 32 C28 25 33 35 42 27 C50 19 54 30 63 20 C72 12 78 24 86 17 C96 8 103 15 120 3"
          : "M0 5 C10 15 15 12 24 23 C32 32 37 21 46 29 C56 38 62 27 70 35 C80 42 87 35 96 42 C106 48 113 44 120 48"
      }
      fill="none"
      stroke={positive ? "var(--success)" : "var(--danger)"}
      strokeWidth="2"
    />
  </svg>
);

/* =========================================================
   CHALLENGE PROGRESS
========================================================= */

const ChallengeProgressBar = ({
  account,
}: {
  account: Account;
}) => {
  if (
    account.type !== "Funded" ||
    (account.fundedStage !== "Phase 1" &&
      account.fundedStage !== "Phase 2") ||
    !account.targetProfit ||
    account.targetProfit <= 0
  ) {
    return null;
  }

  const currentProfit =
    account.balance - account.initialBalance;

  const rawProgress =
    (currentProfit / account.targetProfit) * 100;

  const progress = Math.min(
    Math.max(rawProgress, 0),
    100
  );

  return (
    <div className="mt-3 border-t border-[var(--line-soft)] pt-2">
      <div className="mb-1 flex justify-between text-[9px]">
        <span className="font-semibold text-[var(--ink)]">
          Target: {formatMoney(account.targetProfit)}
        </span>

        <span className="font-bold text-[var(--success)]">
          {progress.toFixed(1)}%
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-[var(--line-soft)]">
        <div
          className="h-1.5 rounded-full bg-[var(--success)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/* =========================================================
   ACCOUNT CARD
========================================================= */

const AccountCard = ({
  account,
  selected,
  onClick,
  onEdit,
  onDelete,
}: {
  account: Account;
  selected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const positive = account.change >= 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`w-full rounded-lg border bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-sm)] transition hover:-translate-y-[1px] ${
        selected
          ? "border-[var(--brand)] ring-1 ring-[var(--brand)]/20"
          : "border-[var(--line)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <AccountLogo account={account} />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-[var(--ink)]">
                {account.name}
              </span>

              <span
                className={`rounded-full px-2 py-[2px] text-[10px] font-semibold ${
                  account.type === "Live"
                    ? "bg-emerald-100 text-emerald-600"
                    : account.type === "Funded"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-[var(--surface-2)] text-blue-600"
                }`}
              >
                {account.type === "Funded" &&
                account.fundedStage
                  ? `Challenge (${account.fundedStage})`
                  : account.type}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            title="Edit account"
            onClick={onEdit}
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete account"
            onClick={onDelete}
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-rose-50 hover:text-rose-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[22px] font-bold tracking-tight text-[var(--ink)]">
            {formatMoney(account.balance)}
          </div>

          <div
            className={`mt-1 text-[11px] font-medium ${
              positive
                ? "text-emerald-600"
                : "text-rose-500"
            }`}
          >
            {positive ? "+" : ""}
            {account.change}% &nbsp;(
            {positive ? "+" : "-"}$
            {Math.abs(account.changeAmount).toFixed(2)})
          </div>
        </div>

        <MiniLineChart positive={positive} />
      </div>

      <ChallengeProgressBar account={account} />

      <div className="mt-3 grid grid-cols-3 border-t border-[var(--line-soft)] pt-3">
        <div>
          <p className="text-[10px] text-[var(--muted)]">
            Balance
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[var(--ink)]">
            {formatMoney(account.balance)}
          </p>
        </div>

        <div className="border-l border-[var(--line)] pl-4">
          <p className="text-[10px] text-[var(--muted)]">
            Equity
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[var(--ink)]">
            {formatMoney(account.equity)}
          </p>
        </div>

        <div className="border-l border-[var(--line)] pl-4">
          <p className="text-[10px] text-[var(--muted)]">
            R/R
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[var(--ink)]">
            {account.rr}
          </p>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   JOURNAL CALCULATIONS
========================================================= */

const emptyMetrics = (): JournalMetrics => ({
  totalTrades: 0,
  winsCount: 0,
  lossesCount: 0,
  breakEvenCount: 0,
  totalLoss: 0,
  maxLoss: 0,
  maxWin: 0,
  avgLoss: 0,
  avgWin: 0,
  bestPair: "N/A",
  netProfit: 0,
  winRate: 0,
  profitFactor: 0,
});

const accountMatchesEntry = (
  account: Account,
  entry: JournalEntry
) => {
  const journalAccount = entry.account
    .trim()
    .toLowerCase();

  const accountName = account.name
    .trim()
    .toLowerCase();

  const broker = account.broker
    .trim()
    .toLowerCase();

  const symbol = entry.symbol
    .trim()
    .toLowerCase();

  /*
   * FTMO
   *
   * Journal:
   * "FTMO Demo"
   *
   * Account:
   * "FTMO Phase 1"
   */
  if (broker === "ftmo") {
    return journalAccount.includes("ftmo");
  }

  /*
   * Exness
   *
   * Journal:
   * "Live Account (Exness)"
   *
   * Account:
   * "Live (Exness)"
   */
  if (broker === "exness") {
    return journalAccount.includes("exness");
  }

  /*
   * IC Markets
   */
  if (broker === "ic markets") {
    return (
      journalAccount.includes("ic markets") ||
      journalAccount.includes("icmarkets")
    );
  }

  /*
   * NAS100
   *
   * NAS100 is treated as its own trading account
   * and can therefore match the symbol.
   */
  if (broker === "nas100") {
    return (
      journalAccount.includes("nas100") ||
      symbol === "nas100"
    );
  }

  /*
   * Other custom accounts
   */
  return (
    journalAccount.includes(accountName) ||
    journalAccount.includes(broker)
  );
};

const calculateJournalMetrics = (
  account: Account,
  entries: JournalEntry[]
): JournalMetrics => {
  const accountEntries = entries.filter((entry) =>
    accountMatchesEntry(account, entry)
  );

  if (accountEntries.length === 0) {
    return emptyMetrics();
  }

  const wins = accountEntries.filter(
    (entry) => entry.profitLoss > 0
  );

  const losses = accountEntries.filter(
    (entry) => entry.profitLoss < 0
  );

  const grossProfit = wins.reduce(
    (sum, entry) => sum + entry.profitLoss,
    0
  );

  const grossLoss = Math.abs(
    losses.reduce(
      (sum, entry) => sum + entry.profitLoss,
      0
    )
  );

  const netProfit = accountEntries.reduce(
    (sum, entry) => sum + entry.profitLoss,
    0
  );

  const pairTotals: Record<string, number> = {};

  accountEntries.forEach((entry) => {
    pairTotals[entry.symbol] =
      (pairTotals[entry.symbol] || 0) +
      entry.profitLoss;
  });

  const bestPair =
    Object.entries(pairTotals).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] || "N/A";

  const maxWin =
    wins.length > 0
      ? Math.max(
          ...wins.map((entry) => entry.profitLoss)
        )
      : 0;

  const maxLoss =
    losses.length > 0
      ? Math.abs(
          Math.min(
            ...losses.map((entry) => entry.profitLoss)
          )
        )
      : 0;

  return {
    totalTrades: accountEntries.length,
    winsCount: wins.length,
    lossesCount: losses.length,
    breakEvenCount: accountEntries.filter((entry) => entry.profitLoss === 0).length,

    totalLoss: grossLoss,

    maxLoss,

    maxWin,

    avgLoss:
      losses.length > 0
        ? grossLoss / losses.length
        : 0,

    avgWin:
      wins.length > 0
        ? grossProfit / wins.length
        : 0,

    bestPair,

    netProfit,

    winRate:
      accountEntries.length > 0
        ? (wins.length / accountEntries.length) * 100
        : 0,

    profitFactor:
      grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
        ? Infinity
        : 0,
  };
};

/* =========================================================
   STAT BOX
========================================================= */

const StatBox = ({
  icon: Icon,
  label,
  value,
  secondary,
  secondaryClassName = "text-emerald-600",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  secondary?: string;
  secondaryClassName?: string;
}) => (
  <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)]">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)]">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>

      <div>
        <p className="text-[10px] text-[var(--muted)]">
          {label}
        </p>

        <p className="text-[15px] font-bold text-[var(--ink)]">
          {value}
        </p>

        {secondary && (
          <p
            className={`mt-1 text-[10px] font-medium ${secondaryClassName}`}
          >
            {secondary}
          </p>
        )}
      </div>
    </div>
  </div>
);

/* =========================================================
   JOURNAL PERFORMANCE
========================================================= */

const JournalAccountMetrics = ({
  metrics,
}: {
  metrics: JournalMetrics;
}) => {
  return (
    <div className="rounded-lg border border-[var(--line)] p-4">
      <div className="flex items-center justify-between pb-3">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--ink)]">
            Journal Trading Performance
          </h3>

          <p className="text-[10px] text-[var(--muted)]">
            Detailed metrics synced directly from your trade journal
          </p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[9px] font-semibold text-blue-600">
          <Activity className="h-3 w-3" />
          Live Journal Data
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-3">
        {/* Total Loss */}
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500">
            <TrendingDown className="h-3.5 w-3.5" />
            Total Loss
          </div>

          <div className="mt-1 text-[16px] font-bold text-rose-500">
            {formatMoney(metrics.totalLoss)}
          </div>
        </div>

        {/* Max Loss */}
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-500">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Max Loss
          </div>

          <div className="mt-1 text-[16px] font-bold text-rose-500">
            {formatMoney(metrics.maxLoss)}
          </div>
        </div>

        {/* Max Win */}
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Max Win
          </div>

          <div className="mt-1 text-[16px] font-bold text-emerald-600">
            {formatMoney(metrics.maxWin)}
          </div>
        </div>

        {/* Avg Loss */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <div className="text-[10px] font-semibold text-[var(--muted-strong)]">
            Avg Loss
          </div>

          <div className="mt-1 text-[16px] font-bold text-[var(--ink)]">
            {formatMoney(metrics.avgLoss)}
          </div>
        </div>

        {/* Avg Win */}
        <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <div className="text-[10px] font-semibold text-[var(--muted-strong)]">
            Avg Win
          </div>

          <div className="mt-1 text-[16px] font-bold text-[var(--ink)]">
            {formatMoney(metrics.avgWin)}
          </div>
        </div>

        {/* Best Pair */}
        <div className="rounded-md border border-[var(--line)] bg-indigo-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--muted)]">
            <Trophy className="h-3.5 w-3.5" />
            Best Pair
          </div>

          <div className="mt-1 text-[16px] font-bold text-[var(--muted)]">
            {metrics.bestPair}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   ACCOUNT PERFORMANCE
========================================================= */

const AccountPerformance = ({
  account,
  metrics,
}: {
  account: Account;
  metrics: JournalMetrics;
}) => {
  const returnPercent =
    account.initialBalance > 0
      ? ((account.balance -
          account.initialBalance) /
          account.initialBalance) *
        100
      : 0;

  const chartProgress = Math.min(
    Math.max(metrics.winRate, 0),
    100
  );

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-blue-600" />

          <h3 className="text-[12px] font-bold text-[var(--ink)]">
            Account Performance
          </h3>
        </div>

        <span className="text-[10px] text-[var(--muted-strong)]">
          Journal
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div
          className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--success) 0 ${chartProgress}%, var(--line-strong) ${chartProgress}% 100%)`,
          }}
        >
          <div className="flex h-[94px] w-[94px] flex-col items-center justify-center rounded-full bg-[var(--surface)]">
            <span
              className={`text-[19px] font-bold ${
                returnPercent >= 0
                  ? "text-emerald-600"
                  : "text-rose-500"
              }`}
            >
              {returnPercent >= 0 ? "+" : ""}
              {returnPercent.toFixed(1)}%
            </span>

            <span className="text-[10px] text-[var(--muted)]">
              Account Return
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex justify-between">
            <span className="text-[10px] text-[var(--muted)]">
              Journal Trades
            </span>

            <span className="text-[11px] font-bold text-[var(--ink)]">
              {metrics.totalTrades}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-[10px] text-[var(--muted)]">
              Win Rate
            </span>

            <span className="text-[11px] font-bold text-[var(--ink)]">
              {metrics.winRate.toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-[10px] text-[var(--muted)]">
              Profit Factor
            </span>

            <span className="text-[11px] font-bold text-[var(--ink)]">
              {Number.isFinite(metrics.profitFactor)
                ? metrics.profitFactor.toFixed(2)
                : "∞"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md bg-[var(--surface-2)] px-3 py-2">
        <div className="flex justify-between">
          <span className="text-[10px] text-[var(--muted)]">
            Journal P/L
          </span>

          <span
            className={`text-[11px] font-bold ${
              metrics.netProfit >= 0
                ? "text-emerald-600"
                : "text-rose-500"
            }`}
          >
            {metrics.netProfit >= 0 ? "+" : "-"}
            {formatMoney(Math.abs(metrics.netProfit))}
          </span>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   RISK ALLOCATION
========================================================= */

const RiskAllocation = ({
  metrics,
}: {
  metrics: JournalMetrics;
}) => {
  const wins = metrics.winsCount;
  const losses = metrics.lossesCount;
  const breakeven = metrics.breakEvenCount;
  const total = Math.max(1, metrics.totalTrades);
  const winPct = (wins / total) * 100;
  const lossPct = (losses / total) * 100;
  const breakPct = (breakeven / total) * 100;
  const lossEnd = winPct + lossPct;
  const gradient = metrics.totalTrades === 0
    ? 'conic-gradient(var(--line-strong) 0 100%)'
    : `conic-gradient(var(--success) 0 ${winPct}%, var(--danger) ${winPct}% ${lossEnd}%, var(--muted) ${lossEnd}% ${lossEnd + breakPct}%, var(--line-strong) ${lossEnd + breakPct}% 100%)`;

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <PieChart className="h-4 w-4 text-[var(--ink)]" />
        <h3 className="text-[12px] font-bold text-[var(--ink)]">Trade Risk / Outcome Allocation</h3>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full" style={{ background: gradient }}>
          <div className="flex h-[65px] w-[65px] items-center justify-center rounded-full bg-[var(--surface)]">
            <span className="text-[13px] font-bold text-[var(--ink)]">{metrics.totalTrades}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-[10px]">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Wins</span><span className="font-semibold text-emerald-600">{wins} ({winPct.toFixed(0)}%)</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Losses</span><span className="font-semibold text-rose-500">{losses} ({lossPct.toFixed(0)}%)</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Break Even</span><span className="font-semibold text-[var(--muted)]">{breakeven} ({breakPct.toFixed(0)}%)</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Net P/L</span><span className={`font-semibold ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatMoney(metrics.netProfit)}</span></div>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   ACCOUNT DETAILS
========================================================= */

const AccountDetails = ({
  account,
}: {
  account: Account;
}) => (
  <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
    <h3 className="text-[12px] font-bold text-[var(--ink)]">
      Account Details
    </h3>

    <div className="mt-3 space-y-2">
      {[
        [
          "Account Type",
          account.type === "Funded" &&
          account.fundedStage
            ? `Funded (${account.fundedStage})`
            : account.type,
        ],
        ["Platform", account.platform],
        ["Leverage", account.leverage],
        ["Currency", account.currency],
        ["Server", account.server],
        ["Account Number", account.accountNumber],
      ].map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between border-b border-[var(--line)] pb-2 text-[10px]"
        >
          <span className="text-[var(--muted)]">
            {label}
          </span>

          <span className="font-medium text-[var(--ink)]">
            {value}
          </span>
        </div>
      ))}
    </div>

    {account.type === "Funded" &&
      (account.fundedStage === "Phase 1" ||
        account.fundedStage === "Phase 2") &&
      account.targetProfit && (
        <div className="mt-3 rounded-md bg-[var(--surface-2)] p-2.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--muted)]">
              Challenge Target:
            </span>

            <span className="font-bold text-[var(--ink)]">
              {formatMoney(account.targetProfit)}
            </span>
          </div>

          <div className="mt-1.5 h-2 w-full rounded-full bg-[var(--surface-2)]">
            <div
              className="h-2 rounded-full bg-[var(--success)]"
              style={{
                width: `${Math.min(
                  Math.max(
                    ((account.balance -
                      account.initialBalance) /
                      account.targetProfit) *
                      100,
                    0
                  ),
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-medium text-emerald-600">
      <span className="h-2 w-2 rounded-full bg-emerald-100" />
      Active
    </div>
  </div>
);

/* =========================================================
   ADD ACCOUNT MODAL
========================================================= */

const AddAccountModal = ({
  onClose,
  onSave,
  accountToEdit,
}: {
  onClose: () => void;
  onSave: (account: Account) => Promise<void>;
  accountToEdit?: Account | null;
}) => {
  const isEditing = Boolean(accountToEdit);

  const [broker, setBroker] = useState(
    accountToEdit ? (findProvider(accountToEdit.broker) ? accountToEdit.broker : "Other") : ""
  );
  const [accountNumber, setAccountNumber] = useState(accountToEdit?.accountNumber || "");
  const [accountName, setAccountName] = useState(accountToEdit?.name || "");
  const [accountType, setAccountType] = useState<"Live" | "Demo" | "Funded">(
    accountToEdit?.type || "Live"
  );
  const [fundedStage, setFundedStage] = useState<FundedStage>(
    accountToEdit?.fundedStage || "Phase 1"
  );
  const [targetProfit, setTargetProfit] = useState(
    accountToEdit?.targetProfit?.toString() || ""
  );
  const [leverage, setLeverage] = useState(
    accountToEdit?.leverage || ""
  );
  const [initialBalance, setInitialBalance] = useState(
    accountToEdit?.initialBalance?.toString() || ""
  );
  const [currency, setCurrency] = useState(accountToEdit?.currency || "USD");
  const [notes, setNotes] = useState(accountToEdit?.notes || "");
  const [logo, setLogo] = useState<File | null>(null);
  const [customBrokerName, setCustomBrokerName] = useState(
    accountToEdit?.broker && !findProvider(accountToEdit.broker) ? accountToEdit.broker : ""
  );
  const [existingLogo, setExistingLogo] = useState(
    accountToEdit?.logo || findProvider(accountToEdit?.broker || "")?.logo || ""
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setFormError("");

    const numericBalance = Number(initialBalance) || 0;
    const numericTarget = Number(targetProfit) || 0;
    const selectedBroker = broker === "Other" ? customBrokerName.trim() : broker;

    if (!selectedBroker) {
      setFormError("Choose a broker / prop firm, or enter a name for a custom one.");
      return;
    }

    setSaving(true);
    try {
      // Only custom uploads are stored. Built-in broker/prop-firm logos are
      // looked up by name when displayed, so no bundler URL is saved to Firestore.
      let logoData = existingLogo.startsWith("data:") ? existingLogo : "";
      if (logo) logoData = await fileToLogoDataUrl(logo);

      const account: Account = {
        id: accountToEdit?.id ?? Date.now(),
        _id: accountToEdit?._id,
        name: accountName.trim() || selectedBroker || "New Account",
        broker: selectedBroker || "Other",
        type: accountType,
        fundedStage: accountType === "Funded" ? fundedStage : undefined,
        targetProfit:
          accountType === "Funded" && (fundedStage === "Phase 1" || fundedStage === "Phase 2")
            ? numericTarget : undefined,
        initialBalance: numericBalance,
        balance: accountToEdit?.balance ?? numericBalance,
        equity: accountToEdit?.equity ?? numericBalance,
        change: accountToEdit?.change ?? 0,
        changeAmount: accountToEdit?.changeAmount ?? 0,
        rr: accountToEdit?.rr ?? "0 : 1",
        color: accountToEdit?.color ?? "var(--ink)",
        accountNumber: accountNumber || "Not provided",
        server: accountToEdit?.server || `${selectedBroker || "Broker"}-Live`,
        platform: accountToEdit?.platform || selectedBroker || "Other",
        leverage: leverage || "1:100",
        currency,
        logo: logoData || undefined,
        logoName: selectedBroker || "Other",
        notes: notes || undefined,
        accountStatus: accountToEdit?.accountStatus || "Active",
      };
      await onSave(account);
    } catch (error: any) {
      console.error("Could not save the account.", error);
      setFormError(error?.message || "Could not save the account.");
    } finally {
      setSaving(false);
    }
  };

  const handleBrokerChange = (value: string) => {
    setBroker(value);
    if (value === "Other") {
      setExistingLogo("");
      setCustomBrokerName("");
    } else {
      setExistingLogo(findProvider(value)?.logo || "");
      setCustomBrokerName("");
    }
  };

  const handleLogoChange = (file: File | null) => {
    setLogo(file);
    if (file) setExistingLogo("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--ink)]/35 px-4 backdrop-blur-[1px]">
      <div className="max-h-[92vh] w-full max-w-[610px] overflow-hidden rounded-xl bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)]">
              <Building2 className="h-5 w-5 text-[var(--brand)]" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[var(--ink)]">
                {isEditing ? "Edit Trading Account" : "Add Trading Account"}
              </h2>
              <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                {isEditing
                  ? "Update the details of your trading account."
                  : "Connect a new trading account to your journal."}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-[var(--ink)] hover:bg-[var(--surface-2)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="grid max-h-[calc(92vh-145px)] grid-cols-2 gap-5 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Broker / Platform</label>
                <select value={broker} onChange={(e) => handleBrokerChange(e.target.value)} required className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] text-[var(--muted-strong)] outline-none focus:border-[var(--brand)]">
                  <option value="">Select Broker / Prop Firm</option>
                  <optgroup label="Prop firms">
                    {propFirms.map((firm) => <option key={firm.name} value={firm.name}>{firm.name}</option>)}
                  </optgroup>
                  <optgroup label="Brokers">
                    {brokers.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                  </optgroup>
                  <option value="Other">Other</option>
                </select>
                {broker === "Other" && (
                  <div className="mt-2 space-y-2">
                    <input value={customBrokerName} onChange={(e) => setCustomBrokerName(e.target.value)} required placeholder="Enter broker / prop firm name" className="h-9 w-full rounded-md border border-[var(--line-strong)] px-3 text-[11px] outline-none focus:border-[var(--brand)]" />
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[var(--line-strong)] px-3 py-2 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)]">
                      <Upload className="h-4 w-4 text-[var(--brand)]" />
                      <span>{logo?.name || "Upload broker logo"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoChange(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Account Number</label>
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 12345678" className="h-9 w-full rounded-md border border-[var(--line-strong)] px-3 text-[11px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]" />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Account Name</label>
                <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g. My FTMO Account" className="h-9 w-full rounded-md border border-[var(--line-strong)] px-3 text-[11px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Account Type</label>
                  <select value={accountType} onChange={(e) => setAccountType(e.target.value as "Live" | "Demo" | "Funded")} className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] text-[var(--muted-strong)] outline-none focus:border-[var(--brand)]">
                    <option value="Live">Live</option>
                    <option value="Demo">Demo</option>
                    <option value="Funded">Prop Firm Challenge</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Leverage</label>
                  <select value={leverage} onChange={(e) => setLeverage(e.target.value)} className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] text-[var(--muted-strong)] outline-none focus:border-[var(--brand)]">
                    <option value="">Select</option>
                    <option value="1:50">1:50</option>
                    <option value="1:100">1:100</option>
                    <option value="1:200">1:200</option>
                    <option value="1:500">1:500</option>
                  </select>
                </div>
              </div>

              {accountType === "Funded" && (
                <div className="space-y-3 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-2)] p-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Funded Stage</label>
                    <select value={fundedStage} onChange={(e) => setFundedStage(e.target.value as FundedStage)} className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] text-[var(--muted-strong)] outline-none focus:border-[var(--brand)]">
                      <option value="Phase 1">Phase 1</option>
                      <option value="Phase 2">Phase 2</option>
                      <option value="Funded">Funded Stage</option>
                    </select>
                  </div>
                  {(fundedStage === "Phase 1" || fundedStage === "Phase 2") && (
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Target Profit Amount (USD)</label>
                      <input type="number" min="0" value={targetProfit} onChange={(e) => setTargetProfit(e.target.value)} placeholder="e.g. 1000" className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]" required />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Initial Balance (USD)</label>
                  <input type="number" min="0" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="e.g. 5000" required className="h-9 w-full rounded-md border border-[var(--line-strong)] px-3 text-[11px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9 w-full rounded-md border border-[var(--line-strong)] bg-[var(--surface)] px-3 text-[11px] text-[var(--muted-strong)] outline-none focus:border-[var(--brand)]">
                    <option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-l border-[var(--line)] pl-5">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
                <div className="flex gap-3">
                  <CircleDollarSign className="mt-0.5 h-4 w-4 text-[var(--brand)]" />
                  <div>
                    <p className="text-[11px] font-bold text-[var(--ink)]">Account information</p>
                    <div className="mt-2 space-y-2 text-[9px] text-[var(--muted-strong)]">
                      {["Journal trades will be matched to this broker/account", "Balance is calculated from initial balance + journal P/L", "You can edit or delete this account later"].map((item) => (
                        <div key={item} className="flex items-center gap-2"><Check className="h-3 w-3 text-[var(--brand)]" />{item}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Account Logo <span className="font-normal text-[var(--muted)]">(Optional)</span></label>
                <label className="flex h-[96px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-blue-300 bg-[var(--surface-2)] hover:bg-[var(--surface-2)]">
                  <ImageIcon className="h-6 w-6 text-[var(--muted)]" />
                  <span className="mt-2 text-[10px] font-medium text-[var(--muted-strong)]">{logo ? logo.name : "Click to upload"}</span>
                  <span className="mt-1 text-[8px] text-[var(--muted)]">PNG, JPG up to 2MB</span>
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleLogoChange(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--ink)]">Notes <span className="font-normal text-[var(--muted)]">(Optional)</span></label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} placeholder="Add any notes about this account..." className="h-[100px] w-full resize-none rounded-md border border-[var(--line-strong)] px-3 py-2 text-[10px] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]" />
                <div className="text-right text-[8px] text-[var(--muted)]">{notes.length}/500</div>
              </div>
            </div>
          </div>

          {formError && (
            <div role="alert" className="mx-5 mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3">
            <button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-md border border-[var(--line-strong)] px-5 text-[11px] font-medium text-[var(--muted-strong)] hover:bg-[var(--surface-2)] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex h-9 items-center gap-2 rounded-md bg-[var(--brand)] px-5 text-[11px] font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   ACCOUNTS PAGE
========================================================= */

const Accounts: React.FC = () => {
  const dialog = useDialog();
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState<string | number>('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountActionAccount, setAccountActionAccount] = useState<Account | null>(null);

  const [journalEntries, setJournalEntries] =
    useState<JournalEntry[]>([]);

  const mapBackendAccount = (item: any): Account => ({
    id: item._id ?? item.id ?? `local-account-${Date.now()}`,
    _id: item._id,
    name: item.name || item.broker || 'Trading Account',
    broker: item.broker || 'Other',
    type: item.accountType || item.type || "Live",
    accountStatus: item.accountStatus || "Active",
    fundedStage: item.fundedStage,
    targetProfit: item.targetProfit,
    initialBalance: Number(item.initialBalance || 0),
    balance: Number(item.currentBalance ?? item.initialBalance ?? 0),
    equity: Number(item.currentBalance ?? item.initialBalance ?? 0),
    change: 0,
    changeAmount: 0,
    rr: item.rr || "0 : 1",
    color: item.color || "var(--ink)",
    accountNumber: item.accountNumber || "Not provided",
    server: item.server || `${item.broker || "Broker"}-Live`,
    platform: item.platform || item.broker || "Other",
    leverage: item.leverage || "1:100",
    currency: item.currency || "USD",
    logo: item.logo,
    logoName: item.logoName,
    notes: item.notes,
  });

  const refreshAccounts = async () => {
    try {
      const response = await fetchAccounts();
      const remote = (response.data.data ?? []).map(mapBackendAccount);
      setAccounts(remote);
      const active = remote.filter((a: Account) => a.accountStatus === "Active");
      setSelectedAccountId(current => active.some((a: Account) => a.id === current) ? current : (active[0]?.id ?? ''));
    } catch (error) {
      console.error('Could not load trading accounts from Firebase.', error);
      setAccounts([]);
      setSelectedAccountId('');
    }
  };

  useEffect(() => {
    void refreshAccounts();
  }, []);

  /* -------------------------------------------------------
     LOAD JOURNAL DATA
  ------------------------------------------------------- */

  const refreshJournalEntries = async () => {
    try {
      const response = await fetchJournalEntries();
      const data = response.data.data ?? [];
      setJournalEntries(data.map((e: any) => ({
        id: e._id,
        date: e.tradeDate ? new Date(e.tradeDate).toISOString().split('T')[0] : '',
        account: e.accountName || e.account?.name || '',
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
        tradingViewScreenshot: e.chartUrl,
        mt5Screenshot: e.mt5Screenshot,
      })));
    } catch (error) {
      console.error('Could not load journal entries from Firebase.', error);
      setJournalEntries([]);
    }
  };

  useEffect(() => {
    refreshJournalEntries();

    /*
     * Refresh when user returns to this page/tab.
     */
    window.addEventListener(
      "focus",
      refreshJournalEntries
    );

    /*
     * Refresh if Journal is open in another tab.
     */
    window.addEventListener(
      "storage",
      refreshJournalEntries
    );

    /*
     * Journal dispatches this event after a trade is added,
     * edited, or deleted in the same browser tab.
     */
    window.addEventListener(
      "journalEntriesUpdated",
      refreshJournalEntries
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshJournalEntries
      );

      window.removeEventListener(
        "storage",
        refreshJournalEntries
      );

      window.removeEventListener(
        "journalEntriesUpdated",
        refreshJournalEntries
      );
    };
  }, []);

  /* -------------------------------------------------------
     SELECTED ACCOUNT
  ------------------------------------------------------- */

  /* -------------------------------------------------------
     SYNC ACCOUNT BALANCES WITH JOURNAL P/L

     The account's starting balance remains the account's
     manual starting balance. The current balance/equity and
     percentage change are then derived from the journal P/L.
  ------------------------------------------------------- */

  const accountsWithJournalData = useMemo(() => {
    return accounts.filter(account => account.accountStatus === "Active").map((account) => {
      const changeAmount = account.balance - account.initialBalance;
      const change = account.initialBalance > 0
        ? (changeAmount / account.initialBalance) * 100
        : 0;

      return {
        ...account,
        balance: account.balance,
        equity: account.balance,
        change,
        changeAmount,
      };
    });
  }, [accounts]);

  /* -------------------------------------------------------
     SELECTED ACCOUNT
  ------------------------------------------------------- */

  const selectedAccount =
    accountsWithJournalData.find(
      (account) => account.id === selectedAccountId
    ) || accountsWithJournalData[0] || {
      id: "empty-account",
      name: "No account selected",
      broker: "Other",
      type: "Demo" as const,
      accountStatus: "Active" as const,
      initialBalance: 0,
      balance: 0,
      equity: 0,
      change: 0,
      changeAmount: 0,
      rr: "0 : 1",
      color: "var(--ink)",
      accountNumber: "Not provided",
      server: "Not connected",
      platform: "Not connected",
      leverage: "1:100",
      currency: "USD",
    };

  /* -------------------------------------------------------
     CALCULATE JOURNAL METRICS
  ------------------------------------------------------- */

  const selectedMetrics = useMemo(
    () =>
      selectedAccount
        ? calculateJournalMetrics(
            selectedAccount,
            journalEntries
          )
        : emptyMetrics(),
    [selectedAccount, journalEntries]
  );

  /* -------------------------------------------------------
     ADD / EDIT / DELETE ACCOUNTS
  ------------------------------------------------------- */

  const openAddAccount = () => {
    setEditingAccount(null);
    setShowAccountModal(true);
  };

  const openEditAccount = (account: Account) => {
    setEditingAccount(account);
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (account: Account) => {
    const payload = {
      name: account.name,
      broker: account.broker,
      accountType: account.type,
      fundedStage: account.fundedStage,
      targetProfit: account.targetProfit,
      initialBalance: account.initialBalance,
      currentBalance: account.balance || account.initialBalance,
      currency: account.currency,
      leverage: account.leverage,
      accountNumber: account.accountNumber,
      server: account.server,
      platform: account.platform,
      color: account.color,
      logo: account.logo,
      logoName: account.logoName,
      notes: account.notes,
      accountStatus: account.accountStatus,
    };

    try {
      const response = await withTimeout(
        account._id
          ? updateAccount(account._id, payload)
          : createAccount(payload),
        15000,
        "Timed out reaching Firestore. Check that the Firestore database exists in the Firebase Console, that firestore.rules are deployed, and that you are online.",
      );
      const saved = mapBackendAccount(response.data.data);
      setAccounts(current => account._id
        ? current.map(item => item._id === account._id ? saved : item)
        : [...current, saved]);
      setSelectedAccountId(saved.id);

      window.dispatchEvent(new Event('accountsUpdated'));
      setEditingAccount(null);
      setShowAccountModal(false);
    } catch (error: any) {
      console.error('Could not save account to Firebase.', error);
      const code = String(error?.code ?? '');
      if (code.includes('permission-denied')) {
        throw new Error('Firestore refused the write (permission-denied). Create the Firestore database and run: firebase deploy --only firestore:rules');
      }
      throw new Error(code ? `${code}: ${error?.message ?? 'Could not save the account.'}` : (error?.message || 'Could not save the account.'));
    }
  };

  const removeAccountLocally = (account: Account) => {
    setAccounts(current => {
      const remaining = current.filter(item => item.id !== account.id);
      if (remaining.length > 0 && account.id === selectedAccountId) {
        const active = remaining.filter(item => item.accountStatus === "Active");
        setSelectedAccountId(active[0]?.id ?? "");
      } else if (remaining.length === 0) {
        setSelectedAccountId("");
      }
      return remaining;
    });
  };

  const archiveFundedAccount = async (account: Account, status: "Passed" | "Breached") => {
    if (!account._id) return;
    try {
      const response = await updateAccount(account._id, { accountStatus: status, isActive: false });
      const saved = mapBackendAccount(response.data.data);
      setAccounts(current => current.map(item => item.id === account.id ? saved : item));
      if (account.id === selectedAccountId) {
        const next = accounts.find(item => item.id !== account.id && item.accountStatus === "Active");
        setSelectedAccountId(next?.id ?? "");
      }
      window.dispatchEvent(new Event('accountsUpdated'));
    } catch (error) {
      console.error(error);
      dialog.toast('error', `Could not mark the account as ${status.toLowerCase()}`);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    if (account.type === "Funded") {
      setAccountActionAccount(account);
      return;
    }

    const confirmed = await dialog.confirm({
      title: `Delete "${account.name}"?`,
      message: "It will be removed from your Accounts list. Trades you've already journaled are kept.",
      confirmLabel: 'Delete account',
      tone: 'danger',
      icon: <Trash2 className="h-5 w-5" strokeWidth={1.9} />,
    });
    if (!confirmed) return;

    try {
      if (account._id) await deleteAccount(account._id);
      removeAccountLocally(account);
      window.dispatchEvent(new Event('accountsUpdated'));
    } catch (error) {
      console.error(error);
      dialog.toast('error', 'Could not delete the account', 'Check that Firebase is configured and that you are signed in, then try again.');
    }
  };

  const permanentlyDeleteArchived = async (account: Account) => {
    const confirmed = await dialog.confirm({
      title: `Permanently delete "${account.name}"?`,
      message: "This removes the archived account permanently. Journal trades are kept.",
      confirmLabel: "Delete permanently",
      tone: "danger",
      icon: <Trash2 className="h-5 w-5" />,
    });
    if (!confirmed) return;
    try {
      if (account._id) await deleteAccount(account._id);
      setAccounts(current => current.filter(item => item.id !== account.id));
    } catch (error) {
      console.error(error);
      dialog.toast('error', 'Could not permanently delete the account');
    }
  };

  return (
    <div className="text-[var(--ink)]">

      {/* =================================================
          HEADER
      ================================================= */}
{/* =================================================
          SIDEBAR
      ================================================= */}
{/* =================================================
          MAIN
      ================================================= */}

      <main>

        <div className="px-4 py-4 lg:px-5">

          {/* PAGE HEADER */}
          <div className="mb-4 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <Building2 className="h-8 w-8 text-[var(--ink)]" />

              <div>
                <h1 className="text-[23px] font-bold leading-none text-[var(--ink)]">
                  Trading Accounts
                </h1>

                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Manage your trading accounts and track their performance.
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={openAddAccount}
              className="flex h-9 items-center gap-2 rounded-md bg-[var(--brand)] px-4 text-[11px] font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
          </div>

          {/* =================================================
              ACCOUNT CARDS
          ================================================= */}

          {accountsWithJournalData.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {accountsWithJournalData.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  selected={account.id === selectedAccountId}
                  onClick={() => setSelectedAccountId(account.id)}
                  onEdit={() => openEditAccount(account)}
                  onDelete={() => handleDeleteAccount(account)}
                />
              ))}
            </div>
          ) : (
            <section className="rounded-xl border border-dashed border-blue-300 bg-[var(--surface)] px-6 py-14 text-center shadow-[0_2px_10px_rgba(34,80,130,0.04)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-2)]"><Building2 className="h-7 w-7 text-[var(--brand)]" /></div>
              <h2 className="mt-4 text-lg font-bold text-[var(--ink)]">No trading accounts yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">Add your first broker or prop-firm account. Once it is saved, its balance, journal performance and risk allocation will appear here.</p>
              <button type="button" onClick={openAddAccount} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[var(--brand)] px-5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add Account</button>
            </section>
          )}

          {/* =================================================
              PASSED / BREACHED ARCHIVE
          ================================================= */}
          {accounts.some(account => account.accountStatus !== "Active") && (
            <section className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[14px] font-bold text-[var(--ink)]">Deleted / Completed Accounts</h2>
                  <p className="mt-1 text-[10px] text-[var(--muted)]">Passed and breached prop-firm challenges are kept here instead of being lost.</p>
                </div>
                <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold text-[var(--muted-strong)]">{accounts.filter(account => account.accountStatus !== "Active").length}</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {accounts.filter(account => account.accountStatus !== "Active").map(account => (
                  <div key={String(account.id)} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5"><AccountLogo account={account} size="small" /><div className="min-w-0"><p className="truncate text-[11px] font-bold text-[var(--ink)]">{account.name}</p><p className={`text-[9px] font-semibold ${account.accountStatus === "Passed" ? "text-emerald-600" : "text-rose-500"}`}>{account.accountStatus}</p></div></div>
                    <button type="button" onClick={() => permanentlyDeleteArchived(account)} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-rose-50 hover:text-rose-500" title="Permanently delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            </section>
          )}


          {/* =================================================
              MAIN CONTENT
          ================================================= */}

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_360px] gap-4" style={{ display: accountsWithJournalData.length ? undefined : "none" }}>

            {/* LEFT */}
            <div className="min-w-0">

              <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">

                {/* ACCOUNT HEADER */}
                <div className="flex items-center justify-between px-4 pt-4">

                  <div className="flex items-center gap-3">

                    <AccountLogo
                      account={selectedAccount}
                    />

                    <div>

                      <div className="flex items-center gap-2">

                        <h2 className="text-[15px] font-bold text-[var(--ink)]">
                          {selectedAccount.name}
                        </h2>

                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-semibold text-emerald-600">
                          {selectedAccount.type ===
                            "Funded" &&
                          selectedAccount.fundedStage
                            ? `Challenge (${selectedAccount.fundedStage})`
                            : selectedAccount.type}
                        </span>

                      </div>

                      <p className="mt-1 text-[9px] text-[var(--muted)]">
                        Account Number:{" "}
                        {selectedAccount.accountNumber}

                        <span className="mx-2 text-[var(--muted)]">
                          |
                        </span>

                        Server:{" "}
                        {selectedAccount.server}
                      </p>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    LIVE STAT BOXES
                ================================================= */}

                <div className="grid grid-cols-4 gap-3 p-3">

                  <StatBox
                    icon={WalletCards}
                    label="Balance"
                    value={formatMoney(
                      selectedAccount.balance
                    )}
                    secondary={`${
                      selectedAccount.change >=
                      0
                        ? "+"
                        : ""
                    }${
                      selectedAccount.change
                    }% (${
                      selectedAccount.changeAmount >=
                      0
                        ? "+"
                        : "-"
                    }$${Math.abs(
                      selectedAccount.changeAmount
                    ).toFixed(2)})`}
                    secondaryClassName={
                      selectedAccount.change >=
                      0
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }
                  />

                  <StatBox
                    icon={ChartIcon}
                    label="Journal Trades"
                    value={String(
                      selectedMetrics.totalTrades
                    )}
                  />

                  <StatBox
                    icon={TrendingUp}
                    label="Journal P/L"
                    value={`${
                      selectedMetrics.netProfit >=
                      0
                        ? "+"
                        : "-"
                    }${formatMoney(
                      Math.abs(
                        selectedMetrics.netProfit
                      )
                    )}`}
                    secondary={
                      selectedMetrics.netProfit >=
                      0
                        ? "Profitable"
                        : "Net Loss"
                    }
                    secondaryClassName={
                      selectedMetrics.netProfit >=
                      0
                        ? "text-emerald-600"
                        : "text-rose-500"
                    }
                  />

                  <StatBox
                    icon={Target}
                    label="Win Rate"
                    value={`${selectedMetrics.winRate.toFixed(
                      1
                    )}%`}
                    secondary={
                      selectedMetrics.profitFactor >
                      0
                        ? `PF ${Number.isFinite(
                            selectedMetrics.profitFactor
                          )
                            ? selectedMetrics.profitFactor.toFixed(
                                2
                              )
                            : "∞"}`
                        : "No trades yet"
                    }
                  />

                </div>

                {/* =================================================
                    JOURNAL + DETAILS
                ================================================= */}

                <div className="grid grid-cols-[minmax(0,1fr)_265px] gap-3 px-3 pb-3">

                  <JournalAccountMetrics
                    metrics={selectedMetrics}
                  />

                  <AccountDetails
                    account={selectedAccount}
                  />

                </div>

              </section>

            </div>

            {/* =================================================
                RIGHT COLUMN
            ================================================= */}

            <div className="space-y-3">

              <AccountPerformance
                account={selectedAccount}
                metrics={selectedMetrics}
              />

              <RiskAllocation
                metrics={selectedMetrics}
              />

            </div>

          </div>

        </div>
      </main>

      {accountActionAccount && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--ink)]">Finish this prop-firm account</h2>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{accountActionAccount.name} can be kept as Passed or Breached instead of simply disappearing.</p>
              </div>
              <button type="button" onClick={() => setAccountActionAccount(null)} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-2">
              <button type="button" onClick={async () => { const a = accountActionAccount; setAccountActionAccount(null); await archiveFundedAccount(a, "Passed"); }} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:bg-emerald-100"><span><span className="block text-[12px] font-bold text-emerald-700">Mark as Passed</span><span className="text-[10px] text-emerald-600">Move it to the completed accounts section.</span></span><Check className="h-5 w-5 text-emerald-600" /></button>
              <button type="button" onClick={async () => { const a = accountActionAccount; setAccountActionAccount(null); await archiveFundedAccount(a, "Breached"); }} className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left hover:bg-rose-100"><span><span className="block text-[12px] font-bold text-rose-700">Mark as Breached</span><span className="text-[10px] text-rose-600">Keep the history while removing it from active accounts.</span></span><X className="h-5 w-5 text-rose-600" /></button>
              <button type="button" onClick={async () => { const a = accountActionAccount; setAccountActionAccount(null); const confirmed = await dialog.confirm({ title: `Delete "${a.name}"?`, message: "This permanently removes the account. Journal trades are kept.", confirmLabel: "Delete account", tone: "danger", icon: <Trash2 className="h-5 w-5" /> }); if (!confirmed) return; try { if (a._id) await deleteAccount(a._id); removeAccountLocally(a); } catch { dialog.toast("error", "Could not delete the account"); } }} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 text-left hover:bg-[var(--surface-2)]"><span><span className="block text-[12px] font-bold text-[var(--ink)]">Delete permanently</span><span className="text-[10px] text-[var(--muted)]">Use this only if you do not want a Passed/Breached record.</span></span><Trash2 className="h-5 w-5 text-[var(--muted)]" /></button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ADD ACCOUNT MODAL
      ================================================= */}

      {showAccountModal && (
        <AddAccountModal
          accountToEdit={editingAccount}
          onClose={() => {
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
        />
      )}

    </div>
  );
};

export default Accounts;