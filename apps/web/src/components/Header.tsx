import { UserDropdown } from './UserDropdown';
import { DarkModeToggle } from './DarkModeToggle';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <header
      className="px-3 sm:px-6 py-2 sm:py-3"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Shogunito
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <DarkModeToggle />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
