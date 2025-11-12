import { Link, useLocation } from 'react-router-dom';
import {
  IconHome,
  IconCalendarEvent,
  IconShoppingCart,
  IconBook,
  IconSettings,
} from '@tabler/icons-react';

const navItems = [
  {
    path: '/',
    label: 'Home',
    icon: IconHome,
    match: (pathname) => pathname === '/',
  },
  {
    path: '/weekly-plan',
    label: 'Meals',
    icon: IconCalendarEvent,
    match: (pathname) => pathname === '/weekly-plan' || pathname === '/',
  },
  {
    path: '/grocery-list',
    label: 'Groceries',
    icon: IconShoppingCart,
    match: (pathname) => pathname.startsWith('/grocery-list'),
  },
  {
    path: '/recipe-suggestions',
    label: 'Recipes',
    icon: IconBook,
    match: (pathname) =>
      pathname.startsWith('/recipe') || pathname.startsWith('/recipe-suggestions'),
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: IconSettings,
    match: (pathname) => pathname.startsWith('/settings'),
  },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-disabled bg-surface-page/95 backdrop-blur"
      aria-label="Main navigation"
    >
      <div className="mx-auto w-full max-w-[430px] px-2">
        <div className="grid h-16 grid-cols-5 gap-1" role="list">
          {navItems.map((item) => {
            const isActive = item.match(location.pathname);
            const IconComponent = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                role="listitem"
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center rounded-lg border-t border-border-disabled text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 ${
                  isActive
                    ? 'bg-surface-primary text-text-display shadow-sm'
                    : 'text-icon-subtle hover:text-text-body'
                }`}
              >
                <IconComponent
                  className="mb-1 h-5 w-5"
                  strokeWidth={isActive ? 2 : 1.5}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

