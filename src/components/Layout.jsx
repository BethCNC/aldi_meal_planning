import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { MenuDrawer } from './MenuDrawer';
import { NavBar } from './NavBar';

function StatusBar() {
  return (
    <div className="flex h-6 items-center justify-between px-4 text-[11px] font-semibold text-text-body">
      <span>9:41</span>
      <div className="flex items-center gap-2 text-icon-display">
        <span aria-hidden className="block h-2.5 w-4 rounded-sm bg-text-body" />
        <span aria-hidden className="block h-2.5 w-4 rounded-sm bg-text-body" />
        <span aria-hidden className="flex h-3 w-6 items-center justify-end rounded-sm border border-border-subtle px-0.5">
          <span className="block h-2 w-3 rounded-[1px] bg-text-body" />
        </span>
      </div>
    </div>
  );
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex min-h-screen w-full justify-center bg-surface-page pb-24">
        <div className="relative flex w-full max-w-[430px] flex-col bg-surface-page pb-24">
          <header className="sticky top-0 z-40 shadow-sm">
            <div className="bg-surface-page">
              <StatusBar />
            </div>
            <NavBar onMenuClick={() => setMenuOpen(true)} />
          </header>

          <main className="flex-1">
            <Outlet />
          </main>

          <BottomNav />
        </div>
      </div>

      <MenuDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
