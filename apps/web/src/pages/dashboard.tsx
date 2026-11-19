import { useAuth } from '../lib/auth';
import { useCommandFilters } from '../lib/command-data';
import { rolePreset, type Preset } from '../lib/command-layout';
import { CommandWorkspace } from '../components/command/command-workspace';
export function Dashboard() {
  const { employee } = useAuth();
  const context = useCommandFilters();
  if (!employee) return null;
  const requested = context.params.get('preset');
  const preset: Preset =
    requested === 'Executive' || requested === 'Operations' || requested === 'Inventory'
      ? requested
      : rolePreset(employee.role);
  return (
    <CommandWorkspace
      key={`${employee.id}:${employee.role}:${preset}`}
      employee={employee}
      preset={preset}
      context={context}
    />
  );
}
