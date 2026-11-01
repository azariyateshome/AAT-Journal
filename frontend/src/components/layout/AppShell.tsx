import React, { useEffect, useState } from "react";
import type { Page } from "../../types/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { useTheme } from "./ThemeToggle";
import { JournalEntryModal } from "../Journal";

type Props = {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onSignOut: () => void;
  children: React.ReactNode;
};

const SIDEBAR_KEY = "journal-sidebar-open";

const initialSidebar = () => {
  if (window.matchMedia("(max-width: 1023px)").matches) return false;
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== "false";
  } catch {
    return true;
  }
};

const AppShell: React.FC<Props> = ({ activePage, onNavigate, onSignOut, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebar);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen text-[var(--ink)]">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main" data-collapsed={!sidebarOpen}>
        <Header
          activePage={activePage}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onNavigate={onNavigate}
          onNewEntry={() => setNewEntryOpen(true)}
          onSignOut={onSignOut}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <div key={activePage} className="animate-page-in">
          {children}
        </div>
      </div>

      {newEntryOpen && (
        <JournalEntryModal
          onClose={() => setNewEntryOpen(false)}
          onSaved={() => setNewEntryOpen(false)}
        />
      )}
    </div>
  );
};

export default AppShell;
