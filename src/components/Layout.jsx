import { Outlet } from 'react-router-dom';
import { IconMenu2 } from '@tabler/icons-react';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-surface-page pb-16">
      {/* Header matching Figma */}
      <header className="bg-surface-card border-b border-border-subtle sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <h1 className="text-lg font-semibold text-text-body">Aldi Groceries Meal Planner</h1>
            <button className="p-2 text-icon-default hover:text-icon-focus">
              <IconMenu2 className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto">
        <Outlet />
      </main>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
