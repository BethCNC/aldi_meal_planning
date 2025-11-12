import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconX, IconHome, IconCalendarEvent, IconShoppingCart, IconBook, IconSettings, IconChefHat } from '@tabler/icons-react';

const menuItems = [
  {
    path: '/',
    label: 'Home',
    icon: IconHome,
  },
  {
    path: '/weekly-plan',
    label: 'Meals',
    icon: IconCalendarEvent,
  },
  {
    path: '/grocery-list',
    label: 'Groceries',
    icon: IconShoppingCart,
  },
  {
    path: '/recipe-suggestions',
    label: 'Recipes',
    icon: IconBook,
  },
  {
    path: '/pantry',
    label: 'Pantry',
    icon: IconChefHat,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: IconSettings,
  },
];

export function MenuDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-80 bg-surface-page shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-border-subtle bg-surface-focus px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-primary text-base font-semibold text-text-display shadow-sm">
                🍏
              </div>
              <span className="text-sm font-semibold tracking-wide uppercase text-text-inverse/80">
                Menu
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-inverse hover:bg-surface-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-focus"
              aria-label="Close menu"
            >
              <IconX className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4" aria-label="Main navigation">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path === '/weekly-plan' && location.pathname === '/');

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigate(item.path)}
                      className={`
                        flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-colors
                        ${isActive
                          ? 'bg-surface-primary text-text-inverse'
                          : 'text-text-body hover:bg-surface-card'
                        }
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <IconComponent
                        className="h-5 w-5 flex-shrink-0"
                        strokeWidth={isActive ? 2 : 1.5}
                        aria-hidden="true"
                      />
                      <span className="text-base font-semibold">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}

