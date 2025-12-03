/**
 * LoadingSpinner Component
 * 
 * Uses design tokens for colors and typography.
 */
export function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-surface-primary"></div>
      <p className="mt-4 text-base font-medium text-text-subtle">{message}</p>
    </div>
  );
}
