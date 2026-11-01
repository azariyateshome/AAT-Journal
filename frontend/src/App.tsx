import React, { useEffect, useState } from "react";
import Home from "./components/Home";
import Journal from "./components/Journal";
import Calendar from "./components/Calendar";
import Accounts from "./components/Accounts";
import Rules from "./components/Rules";
import Certificates from "./components/Certificates";
import AppShell from "./components/layout/AppShell";
import Landing from "./components/landing/Landing";
import Login from "./components/landing/Login";
import { signOut, subscribeToAuth } from "./services/auth";
import type { Page } from "./types/navigation";

type View = "landing" | "login" | "app";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>("Home");
  const [view, setView] = useState<View>("landing");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setView(user ? "app" : "landing");
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const page = (() => {
    switch (currentPage) {
      case "Journal":
        return <Journal />;
      case "Calendar":
        return <Calendar onNavigate={setCurrentPage} />;
      case "Accounts":
        return <Accounts />;
      case "Certificates":
        return <Certificates />;
      case "Rules":
        return <Rules />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  })();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] text-sm text-[var(--muted)]">
        Loading your journal…
      </div>
    );
  }

  if (view === "landing") return <Landing onLogin={() => setView("login")} />;

  if (view === "login") {
    return (
      <Login
        onBack={() => setView("landing")}
        onSuccess={() => {
          setCurrentPage("Home");
          setView("app");
        }}
      />
    );
  }

  return (
    <AppShell
      activePage={currentPage}
      onNavigate={setCurrentPage}
      onSignOut={async () => {
        await signOut();
        setView("landing");
      }}
    >
      {page}
    </AppShell>
  );
};

export default App;
