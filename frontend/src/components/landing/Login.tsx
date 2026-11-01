import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import logoDark from "../../assets/logo/logo-dark.png";
import { resetPassword, signIn } from "../../services/auth";
import "./landing.css";

type Props = { onBack: () => void; onSuccess: () => void };

const Login: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password, remember);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="lp lp-login">
      <button type="button" className="lp-back" onClick={onBack}>
        <ArrowLeft size={16} /> Back to home
      </button>

      <div className="lp-login-grid">
        <section className="lp-login-copy">
          <img src={logoDark} alt="AAT" className="lp-login-mark" />
          <h1>
            Your journal,
            <br />
            back where it belongs.
          </h1>
          <p>Log back in to pick up your ledger right where you left off. Every position, drawdown and rule intact.</p>

          <div className="lp-session">
            <div className="lp-mono lp-session-tag">Sample session</div>
            <div className="lp-session-row">
              <b>GOLD M15</b>
              <span className="lp-mono lp-win">+3.2R</span>
            </div>
            <div className="lp-session-bar"><i /></div>
          </div>
        </section>

        <section className="lp-login-card">
          <h2>Welcome back</h2>
          <p className="lp-login-sub">Sign in to your AAT journal.</p>

          <form onSubmit={submit} noValidate>
            <label htmlFor="lp-email">Email address</label>
            <input
              id="lp-email"
              type="email"
              autoComplete="email"
              placeholder="trader@aat.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
            />

            <label htmlFor="lp-pass">Password</label>
            <div className="lp-pass">
              <input
                id="lp-pass"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show}>
                {show ? "Hide" : "Show"}
              </button>
            </div>

            <div className="lp-login-row">
              <label className="lp-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Keep me signed in</span>
              </label>
              <button
                type="button"
                className="lp-link"
                onClick={async () => {
                  setError("");
                  setNote("");
                  try {
                    await resetPassword(email);
                    setNote("Password reset email sent. Check your inbox.");
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not send the reset email.");
                  }
                }}
              >
                Forgot password?
              </button>
            </div>

            {(error || note) && (
              <div className={error ? "lp-msg lp-msg-error" : "lp-msg"} role={error ? "alert" : "status"}>
                {error || note}
              </div>
            )}

            <button type="submit" className="lp-btn lp-btn-main lp-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to journal"}
            </button>
          </form>
        </section>
      </div>

      <div className="lp-login-foot lp-mono">© 2026 AAT · Trade journal</div>
    </div>
  );
};

export default Login;
