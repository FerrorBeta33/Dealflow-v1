import type { ButtonHTMLAttributes } from 'react';
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground border-primary shadow-control hover:bg-primary/90',
    secondary: 'bg-card text-foreground border-border shadow-control hover:bg-accent',
    danger: 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90',
  };
  return (
    <button
      type="button"
      {...props}
      className={
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-control border px-4 py-2 ' +
        'text-sm font-semibold transition duration-150 active:scale-95 focus-visible:outline-2 ' +
        `focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`
      }
    >
      {children}
    </button>
  );
}
