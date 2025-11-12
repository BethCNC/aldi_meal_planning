import { IconChevronRight } from '@tabler/icons-react';

/**
 * Breadcrumb navigation component
 * 
 * @param {Array<{label: string, href?: string, onClick?: function}>} items - Breadcrumb items
 * @param {string} className - Additional CSS classes
 */
export function Breadcrumb({ items = [], className = '' }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isActive = isLast || !item.href;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <IconChevronRight
                  className="h-4 w-4 text-icon-subtle"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  onClick={item.onClick}
                  className="text-icon-subtle hover:text-text-body transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={isActive ? 'text-text-body font-semibold' : 'text-icon-subtle'}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

