import React, { useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight, BookOpen, Building2, ShieldCheck } from "lucide-react";
import logoDark from "../../assets/logo/logo-dark.png";
import { propFirms } from "../../data/propFirms";
import { brokers } from "../../data/brokers";
import "./landing.css";

type Props = { onLogin: () => void };

type Bar = { h: number; kind: "win" | "loss" | "be" };

const MODES = {
  funded: {
    tag: "MT-100K · FTMO",
    pnl: "+$14,820",
    pct: "+14.82% this month",
    win: "68.4%",
    risk: ["1.2%", "4.0%"],
    dd: ["-2.6%", "-10%"],
    target: "3 of 4 met",
    bars: [
      { h: 22, kind: "win" },
      { h: 46, kind: "win" },
      { h: 20, kind: "loss" },
      { h: 62, kind: "win" },
      { h: 84, kind: "win" },
      { h: 52, kind: "be" },
      { h: 100, kind: "win" },
    ] as Bar[],
  },
  live: {
    tag: "Live · Exness",
    pnl: "+$2,314",
    pct: "+9.26% this month",
    win: "61.2%",
    risk: ["0.8%", "2.0%"],
    dd: ["-1.4%", "-5%"],
    target: "2 of 3 met",
    bars: [
      { h: 40, kind: "win" },
      { h: 26, kind: "loss" },
      { h: 58, kind: "win" },
      { h: 34, kind: "be" },
      { h: 72, kind: "win" },
      { h: 30, kind: "loss" },
      { h: 88, kind: "win" },
    ] as Bar[],
  },
};
type Mode = keyof typeof MODES;

const FEATURES = [
  {
    icon: ShieldCheck,
    tone: "accent",
    title: "Rule guardrails",
    body: "Write your firm's or your own limits as rules, then mark every trade as followed or broken.",
  },
  {
    icon: BookOpen,
    tone: "win",
    title: "Win / loss ledger",
    body: "Every session scored in emerald and rose so your edge is impossible to lose sight of.",
  },
  {
    icon: Building2,
    tone: "loss",
    title: "Firms and brokers, one ledger",
    body: "Track funded accounts and live broker accounts side by side in a single journal.",
  },
];

const Tile: React.FC<{ name: string; logo: string; dark?: boolean }> = ({ name, logo, dark }) => (
  <li className={`lp-tile${dark ? " lp-tile-dark" : ""}`} title={name}>
    <img src={logo} alt={name} loading="lazy" draggable={false} />
  </li>
);

const Row: React.FC<{ label: string; items: { name: string; logo: string; darkArt?: boolean }[]; reverse?: boolean }> = ({
  label,
  items,
  reverse,
}) => (
  <div className="lp-row">
    <div className="lp-row-label">{label}</div>
    <div className="lp-marquee">
      <ul className={`lp-track${reverse ? " lp-track-rev" : ""}`}>
        {[...items, ...items].map((item, i) => (
          <Tile key={`${item.name}-${i}`} name={item.name} logo={item.logo} dark={item.darkArt} />
        ))}
      </ul>
    </div>
  </div>
);

const Landing: React.FC<Props> = ({ onLogin }) => {
  const [mode, setMode] = useState<Mode>("funded");
  const m = MODES[mode];

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="lp">
      <nav className="lp-nav" aria-label="Main">
        <div className="lp-brand">
          <img src={logoDark} alt="" className="lp-brand-mark" />
          <span>AAT</span>
        </div>
        <div className="lp-links">
          <button type="button" onClick={() => scrollTo("features")}>Features</button>
          <button type="button" onClick={() => scrollTo("works-with")}>Firms &amp; brokers</button>
        </div>
        <div className="lp-nav-end">
          <button type="button" className="lp-textbtn" onClick={onLogin}>Log in</button>
          <button type="button" className="lp-pill" onClick={onLogin}>Open app</button>
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-copy">
          <div className="lp-badge">
            <i /> Prop firms and brokers, one ledger
          </div>
          <h1>
            Know <em>every account</em> before the market opens.
          </h1>
          <p>
            One journal for your trades, drawdowns and rules. Built for traders who live and die by the numbers,
            whether the account is funded or your own.
          </p>
          <div className="lp-cta">
            <button type="button" className="lp-btn lp-btn-main" onClick={onLogin}>
              Start logging trades
            </button>
            <button type="button" className="lp-btn lp-btn-ghost" onClick={() => scrollTo("features")}>
              See how it works <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="lp-stage">
          <div className="lp-card" aria-label="Sample dashboard preview">
            <div className="lp-card-head">
              <span className="lp-mono">{m.tag}</span>
              <div className="lp-seg" role="group" aria-label="Sample account type">
                <button type="button" aria-pressed={mode === "funded"} onClick={() => setMode("funded")}>Funded</button>
                <button type="button" aria-pressed={mode === "live"} onClick={() => setMode("live")}>Live</button>
              </div>
            </div>
            <div className="lp-pnl">{m.pnl}</div>
            <div className="lp-mono lp-win">{m.pct}</div>

            <dl className="lp-stats">
              <div><dt>Win rate</dt><dd>{m.win}</dd></div>
              <div><dt>Risk / day</dt><dd className="lp-win">{m.risk[0]} / {m.risk[1]}</dd></div>
              <div><dt>Drawdown</dt><dd className="lp-loss">{m.dd[0]} / {m.dd[1]}</dd></div>
            </dl>

            <div className="lp-bars" key={mode} aria-hidden="true">
              {m.bars.map((b, i) => (
                <span key={i} className={`lp-bar lp-bar-${b.kind}`} style={{ "--h": `${b.h}%`, "--i": i } as CSSProperties} />
              ))}
            </div>
            <div className="lp-sample">Sample data</div>
          </div>

          <div className="lp-float">
            <span className="lp-mono">Daily target</span>
            <b>{m.target}</b>
          </div>
        </div>
      </header>

      <section id="features" className="lp-section">
        <div className="lp-features">
          {FEATURES.map(({ icon: Icon, tone, title, body }) => (
            <article key={title} className="lp-feature">
              <span className={`lp-ico lp-ico-${tone}`}><Icon size={19} strokeWidth={1.9} /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="works-with" className="lp-section lp-works">
        <h2>Prop firm or broker, same journal.</h2>
        <p>Pick your firm or broker when you add an account and its logo follows every balance and trade.</p>
        <Row label="Prop firms" items={propFirms} />
        <Row label="Brokers" items={brokers} reverse />
      </section>

      <footer className="lp-foot">
        <span className="lp-mono">© 2026 AAT · Trade journal</span>
        <button type="button" className="lp-textbtn" onClick={onLogin}>Log in</button>
      </footer>
    </div>
  );
};

export default Landing;
