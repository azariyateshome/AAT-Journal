import React from "react";
import { Home as HomeIcon, BookOpen, Building2, ShieldCheck, CalendarDays, Award, X } from "lucide-react";
import type { Page } from "../../types/navigation";
import Logo from "./Logo";
import Inscription from "./Inscription";

export const navItems: { label: Page; icon: React.ElementType }[] = [
  { label: "Home", icon: HomeIcon },
  { label: "Journal", icon: BookOpen },
  { label: "Accounts", icon: Building2 },
  { label: "Certificates", icon: Award },
  { label: "Rules", icon: ShieldCheck },
  { label: "Calendar", icon: CalendarDays },
];

type Props = {
  activePage: Page;
  onNavigate: (page: Page) => void;
  open: boolean;
  onClose: () => void;
};

const Sidebar: React.FC<Props> = ({ activePage, onNavigate, open, onClose }) => {
  const isMobile = () => window.matchMedia("(max-width: 1023px)").matches;

  const navigate = (page: Page) => {
    onNavigate(page);
    if (isMobile()) onClose();
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside className="app-sidebar" data-open={open} aria-hidden={!open}>
        <div className="side-brand">
          <Logo className="side-logo" />
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold leading-tight text-[var(--side-ink)]">
              AAT Journal
            </div>
            <div className="mono mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-[var(--side-muted)]">
              Trade index
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-[var(--side-muted)] hover:text-[var(--side-ink)] lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1 px-2.5 pt-2" aria-label="Primary navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(label)}
              aria-current={activePage === label ? "page" : undefined}
              tabIndex={open ? 0 : -1}
              className="side-item"
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <Inscription />
      </aside>
    </>
  );
};

export default Sidebar;
