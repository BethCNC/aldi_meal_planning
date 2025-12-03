import { Link, useLocation } from 'react-router-dom';
import {
  IconHome,
  IconCalendarEvent,
  IconShoppingCart,
  IconBook,
  IconSettings,
  IconSparkles,
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
    match: (pathname) => pathname === '/weekly-plan',
  },
  {
    path: '/grocery-list',
    label: 'Groceries',
    icon: IconShoppingCart,
    match: (pathname) => pathname.startsWith('/grocery-list'),
  },
  {
    path: '/recipe-discovery',
    label: 'Discover',
    icon: IconSparkles,
    match: (pathname) => pathname.startsWith('/recipe-discovery'),
  },
  {
    path: '/recipe-suggestions',
    label: 'Recipes',
    icon: IconBook,
    match: (pathname) =>
      pathname.startsWith('/recipe') && !pathname.startsWith('/recipe-discovery'),
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
        <div className="grid h-16 grid-cols-6" role="list">
          {navItems.map((item) => {
            const isActive = item.match(location.pathname);
            const IconComponent = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                role="listitem"
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 border-t px-1 py-2 text-xs font-semibold transition cursor-pointer focus:outline-none ${
                  isActive
                    ? 'bg-surface-primary border-border-subtle'
                    : 'border-border-disabled hover:border-border-subtle focus:bg-surface-focus-subtle focus:border-border-focus'
                }`}
              >
                <IconComponent
                  className={`h-6 w-6 ${
                    isActive
                      ? 'text-icon-display'
                      : 'text-icon-disabled hover:text-icon-subtle focus:text-icon-focus'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                  aria-hidden="true"
                />
                <span className={`truncate w-full text-center ${isActive ? 'text-text-display' : 'text-text-disabled hover:text-text-subtle focus:text-text-focus'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

