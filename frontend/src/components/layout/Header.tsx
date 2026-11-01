import React from "react";
import { ArrowLeft, LogOut, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import type { Page } from "../../types/navigation";
import ThemeToggle, { type Theme } from "./ThemeToggle";
import { navItems } from "./Sidebar";

type Props = {
  activePage: Page;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNavigate: (page: Page) => void;
  onNewEntry: () => void;
  onSignOut: () => void;
  theme: Theme;
  onToggleTheme: () => void;
};

const Header: React.FC<Props> = ({
  activePage,
  sidebarOpen,
  onToggleSidebar,
  onNavigate,
  onNewEntry,
  onSignOut,
  theme,
  onToggleTheme,
}) => {
  // With the sidebar tucked away the header carries the navigation instead.
  const tabs = navItems.filter(({ label }) => label !== "Home");

  return (
    <header className="app-header">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-[var(--ink)] hover:bg-[var(--surface-2)]"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.8} />
          ) : (
            <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.8} />
          )}
        </button>
        {!sidebarOpen && activePage !== 'Home' && (
          <button
            type="button"
            onClick={() => onNavigate('Home')}
            className="-ml-1 rounded-md p-2 text-[var(--ink)] hover:bg-[var(--surface-2)]"
            aria-label="Back to home"
            title="Back to home"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        )}

        <div className="crumb min-w-0 truncate">
          <b>AAT</b>
          <span aria-hidden="true">/</span>
          <span>{activePage}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <nav className="mr-2 hidden items-center gap-1 lg:flex" aria-label="Sections">
            {tabs.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => onNavigate(label)}
                aria-current={activePage === label ? "page" : undefined}
                className="nav-pill"
              >
                <Icon className="h-4 w-4" strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </nav>
        )}

        <button type="button" onClick={onNewEntry} className="btn-primary">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Entry</span>
        </button>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button type="button" onClick={onSignOut} className="icon-btn" aria-label="Sign out" title="Sign out">
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
};

export default Header;
