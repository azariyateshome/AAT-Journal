import React, { useEffect, useMemo, useState } from "react";

type Quote = { text: string; en?: string; by?: string; latin?: boolean };

const QUOTES: Quote[] = [
  { text: "Aut viam inveniam aut faciam", en: "I will either find a way, or I will make one.", latin: true },
  { text: "Vincere aut mori", en: "Conquer or die.", latin: true },
  { text: "Veni, vidi, vici", en: "I came, I saw, I conquered.", latin: true },
  { text: "Oderint dum metuant", en: "Let them hate, so long as they fear me.", latin: true },
  { text: "Ex duris gloria", en: "From suffering comes glory.", latin: true },
  { text: "Vae victis", en: "Woe to the conquered.", latin: true },
  { text: "In hoc signo vinces", en: "In this sign, you shall conquer.", latin: true },
  { text: "Non ducor, duco", en: "I am not led, I lead.", latin: true },
  { text: "Dum spiro spero", en: "While I breathe, there is hope.", latin: true },
  { text: "Faciam quodlibet quod necesse est", en: "I'll do whatever it takes.", latin: true },
  { text: "Fortes fortuna adiuvat", en: "Fortune favors the brave.", latin: true },
  {
    text: "Flectere si nequeo superos, Acheronta movebo",
    en: "If I cannot bend the will of Heaven, I shall raise Hell.",
    latin: true,
  },
  {
    text: "What are you afraid of losing, when nothing in the world belongs to you?",
    by: "Marcus Aurelius",
  },
];

const HOLD_MS = 11000;
const STEP_MS = 42;

/** Words stay whole (so lines wrap cleanly); each letter is carved in on its own delay. */
const Carved: React.FC<{ text: string }> = ({ text }) => {
  let n = 0;
  return (
    <>
      {text.split(" ").map((word, w) => (
        <span className="ins-word" key={w}>
          {word.split("").map((ch, c) => (
            <span className="ins-ch" key={c} style={{ ["--i" as string]: n++ } as React.CSSProperties}>
              {ch}
            </span>
          ))}
          {"\u00A0"}
        </span>
      ))}
    </>
  );
};

/** Meander (Greek key) frieze that unrolls left to right. */
const Frieze: React.FC<{ flip?: boolean }> = ({ flip }) => (
  <div className={`ins-frieze${flip ? " ins-frieze-flip" : ""}`} aria-hidden="true" />
);

const Inscription: React.FC = () => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), HOLD_MS);
    return () => window.clearInterval(id);
  }, []);

  const quote = QUOTES[index];
  const letters = useMemo(() => quote.text.replace(/ /g, "").length, [quote]);
  const enDelay = letters * STEP_MS + 350;

  return (
    <aside className="inscription" aria-label="Words to trade by">
      <svg className="ins-flow" viewBox="0 0 175 300" preserveAspectRatio="none" aria-hidden="true">
        <path className="ins-wave w1" d="M-5 40 C 35 10, 70 70, 110 40 S 175 10, 185 40" />
        <path className="ins-wave w2" d="M-5 110 C 30 80, 75 140, 115 110 S 170 80, 185 110" />
        <path className="ins-wave w3" d="M-5 190 C 40 160, 70 220, 115 190 S 165 160, 185 190" />
        <path className="ins-wave w4" d="M-5 262 C 35 232, 80 292, 120 262 S 170 232, 185 262" />
      </svg>

      <Frieze />

      <figure
        className="ins-stage"
        key={index}
        style={{ ["--d" as string]: `${enDelay}ms`, ["--r" as string]: `${enDelay - 300}ms` } as React.CSSProperties}
      >
        <blockquote className={quote.latin ? "ins-latin" : "ins-plain"}>
          <Carved text={quote.text} />
        </blockquote>

        <div className="ins-rule" aria-hidden="true">
          <i />
        </div>

        {quote.en && <figcaption className="ins-en">{quote.en}</figcaption>}
        {quote.by && <div className="ins-by">{quote.by}</div>}
      </figure>

      <Frieze flip />
    </aside>
  );
};

export default Inscription;
