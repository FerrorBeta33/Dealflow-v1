import { Route, Routes, Link } from 'react-router-dom';
import { useAuth } from './lib/auth';
import type { Entity } from './lib/types';
import { Loading } from './components/ui';
import { AppShell } from './components/app-shell';
import { Login } from './pages/login';
import { Dashboard } from './pages/dashboard';
import { EntityList } from './pages/entity-list';
import { EntityEdit } from './pages/entity-edit';
import { EntityDetail } from './pages/entity-detail';
import { OrderDetail } from './pages/order-detail';
export function App() {
  const { employee, loading } = useAuth();
  if (loading)
    return (
      <div className="mx-auto max-w-xl p-12">
        <Loading />
      </div>
    );
  if (!employee) return <Login />;
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/overview" element={<Dashboard />} />
        {(['models', 'vehicles', 'customers', 'bookings', 'orders'] as Entity[]).map((entity) => (
          <Route
            key={entity}
            path={`/${entity}`}
            element={<EntityList key={entity} entity={entity} />}
          />
        ))}
        {(['models', 'vehicles', 'customers', 'bookings'] as Entity[]).map((entity) => (
          <Route
            key={`${entity}-new`}
            path={`/${entity}/new`}
            element={<EntityEdit entity={entity} />}
          />
        ))}
        {(['models', 'vehicles', 'customers'] as Entity[]).map((entity) => (
          <Route
            key={`${entity}-edit`}
            path={`/${entity}/:id/edit`}
            element={<EntityEdit entity={entity} />}
          />
        ))}
        {(['models', 'vehicles', 'customers', 'bookings'] as Entity[]).map((entity) => (
          <Route
            key={`${entity}-detail`}
            path={`/${entity}/:id`}
            element={<EntityDetail entity={entity} />}
          />
        ))}
        <Route path="/orders/:id/*" element={<OrderDetail />} />
        <Route
          path="*"
          element={
            <section>
              <h1 className="text-2xl font-semibold">Page not found</h1>
              <Link className="mt-6 block text-primary underline" to="/">
                Return to overview
              </Link>
            </section>
          }
        />
      </Routes>
    </AppShell>
  );
}
