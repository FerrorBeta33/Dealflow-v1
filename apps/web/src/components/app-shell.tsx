import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  CarFront,
  LayoutDashboard,
  UsersRound,
  TicketCheck,
  ClipboardList,
  LibraryBig,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Button, ErrorBox } from './ui';
import { SidebarAccount } from './sidebar-account';
const links = [
  { to: '/', title: 'Overview', icon: LayoutDashboard },
  { to: '/vehicles', title: 'Vehicle inventory', icon: CarFront },
  { to: '/models', title: 'Model catalog', icon: LibraryBig },
  { to: '/customers', title: 'Customers', icon: UsersRound },
  { to: '/bookings', title: 'Bookings', icon: TicketCheck },
  { to: '/orders', title: 'Sales orders', icon: ClipboardList },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { employee, signOut } = useAuth();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [state, setState] = useState({ pending: false, error: '' });
  async function logout() {
    setState({ pending: true, error: '' });
    try {
      await signOut();
    } catch (error) {
      setState({
        pending: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      });
    }
  }
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <a href="#main-content" className="sr-only z-50 bg-card p-4 focus:not-sr-only focus:fixed">
        Skip to content
      </a>
      <aside
        className={
          'fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-border bg-card ' +
          'text-foreground lg:flex print:hidden'
        }
      >
        <Link to="/" className="px-6 py-8 text-2xl font-semibold tracking-tight text-primary">
          DealerFlow
          <span className="mt-2 block text-xs font-normal tracking-wide text-muted-foreground">
            DEALERSHIP OPERATIONS
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex-1 space-y-2 px-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                'flex min-h-12 items-center gap-3 rounded-control border-l-4 px-4 text-sm font-medium transition ' +
                (isActive || (link.to === '/' && location.pathname === '/overview')
                  ? 'border-primary bg-accent text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground')
              }
            >
              <link.icon size={20} />
              {link.title}
            </NavLink>
          ))}
        </nav>
        <SidebarAccount
          employee={employee}
          pending={state.pending}
          error={state.error}
          onSignOut={() => void logout()}
        />
      </aside>
      <div className="lg:pl-56 print:pl-0">
        <header
          className={
            'flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card/95 ' +
            'px-4 backdrop-blur-sm sm:px-8 print:hidden'
          }
        >
          <p className="text-sm font-medium capitalize text-foreground">
            DealerFlow <span className="mx-2 text-border">/</span>{' '}
            {location.pathname.split('/')[1] || 'Overview'}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Fictional demo · INR · V1.1
          </p>
          <Button
            variant="secondary"
            className="lg:hidden"
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </header>
        {menu && (
          <nav
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setMenu(false);
            }}
            className="space-y-1 border-b border-border bg-card p-4 lg:hidden print:hidden"
          >
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenu(false)}
                className="flex min-h-12 items-center gap-3 rounded-control px-4 hover:bg-muted"
              >
                <link.icon size={18} aria-hidden="true" />
                {link.title}
              </Link>
            ))}
            <Button variant="secondary" disabled={state.pending} onClick={() => void logout()}>
              Sign out
            </Button>
            <ErrorBox error={state.error} />
          </nav>
        )}
        <main
          id="main-content"
          className="mx-auto max-w-screen-2xl p-4 motion-safe:animate-enter sm:p-6 print:max-w-none print:p-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
