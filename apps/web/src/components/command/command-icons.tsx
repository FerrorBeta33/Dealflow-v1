import {
  Activity,
  AlertTriangle,
  Boxes,
  CarFront,
  CheckCheck,
  ClipboardList,
  FileCheck2,
  IndianRupee,
  TicketCheck,
  Truck,
  Wallet,
  Clock3,
} from 'lucide-react';
const icons = {
  available: CarFront,
  activeBookings: TicketCheck,
  openOrders: ClipboardList,
  collected: IndianRupee,
  outstanding: Wallet,
  ready: CheckCheck,
  inTransit: Truck,
  invoiced: ClipboardList,
  paymentBlocked: Wallet,
  documentBlocked: FileCheck2,
  delivered: CheckCheck,
  aged30: Clock3,
  aged45: Clock3,
  cycle: Activity,
  paidOrders: IndianRupee,
  verifiedOrders: FileCheck2,
  stock: Boxes,
  booking: TicketCheck,
  order: ClipboardList,
  payment: IndianRupee,
  documents: FileCheck2,
  delivery: CheckCheck,
  combined: AlertTriangle,
  aging: Clock3,
};
export function CommandIcon({
  name,
  size = 18,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = icons[name as keyof typeof icons] || Activity;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
