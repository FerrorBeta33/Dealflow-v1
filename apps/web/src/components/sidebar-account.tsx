import { LogOut } from 'lucide-react';
import { Button, ErrorBox } from './ui';

export function SidebarAccount({
  employee,
  pending,
  error,
  onSignOut,
}: {
  employee?: { name: string; role: string } | null;
  pending: boolean;
  error: string;
  onSignOut: () => void;
}) {
  return (
    <div className="mx-4 mb-4 space-y-4 rounded-container border border-border bg-background/60 p-4">
      <p className="text-sm font-semibold">
        {employee?.name}
        <span className="mt-1 block font-normal capitalize text-muted-foreground">
          {employee?.role === 'manager' ? 'Branch manager' : employee?.role}
        </span>
      </p>
      <Button
        variant="secondary"
        className={
          'w-full border-border bg-card text-foreground hover:bg-accent'
        }
        disabled={pending}
        onClick={onSignOut}
      >
        <LogOut size={16} />
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
      <ErrorBox error={error} />
    </div>
  );
}
