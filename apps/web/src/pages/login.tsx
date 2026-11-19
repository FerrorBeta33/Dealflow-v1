import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { Button, ErrorBox, Field, Input } from '../components/ui';
export function Login() {
  const { signIn, message } = useAuth();
  const [state, setState] = useState({ email: '', password: '', pending: false, error: '' });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ ...state, pending: true, error: '' });
    try {
      await signIn(state.email, state.password);
    } catch (error) {
      setState({
        ...state,
        pending: false,
        error: error instanceof Error ? error.message : 'Could not sign in',
      });
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-12 text-foreground">
      <div
        className={
          'grid w-full max-w-5xl overflow-hidden rounded-container border border-border bg-card ' +
          'shadow-surface lg:grid-cols-2'
        }
      >
        <section className="bg-linear-to-br from-navigation to-navigation-deep p-8 text-navigation-foreground sm:p-12">
          <p className="text-2xl font-semibold tracking-tight">DealerFlow</p>
          <h1 className="mt-12 text-balance text-4xl font-semibold leading-tight tracking-tight">
            From showroom
            <br />
            to handover.
          </h1>
          <p className="mt-6 max-w-sm leading-relaxed text-navigation-muted">
            One connected workspace for your inventory, customers, sales and deliveries.
          </p>
          <ol className="mt-12 space-y-4 border-t border-navigation-foreground/20 pt-8 text-sm">
            <li>01 · Reserve the right VIN</li>
            <li>02 · Keep every order moving</li>
            <li>03 · Deliver with confidence</li>
          </ol>
          <p className="mt-12 text-sm text-navigation-muted">
            V1.0 · Fictional dealership demo · INR
          </p>
        </section>
        <section className="p-8 sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight">Employee sign in</h2>
          <p className="mt-2 text-muted-foreground">Use your dealership employee account.</p>
          <form onSubmit={submit} className="mt-8 space-y-6">
            <ErrorBox error={state.error} />
            {message && (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <Field label="Email *">
              <Input
                type="email"
                autoComplete="username"
                required
                value={state.email}
                onChange={(event) => setState({ ...state, email: event.target.value })}
              />
            </Field>
            <Field label="Password *">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={state.password}
                onChange={(event) => setState({ ...state, password: event.target.value })}
              />
            </Field>
            <Button className="w-full" type="submit" disabled={state.pending}>
              {state.pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-8 text-sm text-muted-foreground">
            Demo accounts cover Admin, Sales, Inventory and Branch manager. Setup saves their
            generated login details in .data/demo-access.json (not committed).
          </p>
        </section>
      </div>
    </main>
  );
}
