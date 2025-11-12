import { Link, useLocation } from 'react-router-dom';
import { IconHome, IconMenu2, IconShoppingCart, IconChefHat, IconSettings } from '@tabler/icons-react';

const navItems = [
  { path: '/', label: 'Home', icon: IconHome },
  { path: '/weekly-plan', label: 'Menu', icon: IconMenu2 },
  { path: '/grocery-list', label: 'Groceries', icon: IconShoppingCart },
  { path: '/pantry', label: 'Pantry', icon: IconChefHat },
  { path: '/settings', label: 'Settings', icon: IconSettings },
];

export function BottomNav() {
  const location = useLocation();
  
  const isActiveRoute = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/weekly-plan';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-page border-t border-border-subtle z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = isActiveRoute(item.path);
            const IconComponent = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-text-body' : 'text-icon-subtle'
                }`}
              >
                <IconComponent 
                  className="w-6 h-6 mb-1" 
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

