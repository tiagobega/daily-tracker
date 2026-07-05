import { Link } from '@tanstack/react-router';
import { Calendar, CalendarCheck, Settings, Target } from 'lucide-react';

// Bottom tab bar (plan-docs/10). Only "Hoje" is routable in Fase 3; the other
// tabs are placeholders until their screens exist (Fases 6–8).
const ITEMS = [
	{ label: 'Hoje', icon: CalendarCheck, to: '/today' as const },
	{ label: 'Calendário', icon: Calendar, to: '/calendar' as const },
	{ label: 'Objetivos', icon: Target, to: null },
	{ label: 'Ajustes', icon: Settings, to: null },
];

export function BottomNav() {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-stretch border-t bg-background pb-[env(safe-area-inset-bottom)]">
			{ITEMS.map(({ label, icon: Icon, to }) =>
				to ? (
					<Link
						key={label}
						to={to}
						className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground text-xs"
						activeProps={{ className: 'text-foreground' }}
					>
						<Icon className="size-5" />
						{label}
					</Link>
				) : (
					<span
						key={label}
						aria-disabled
						className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground/40 text-xs"
					>
						<Icon className="size-5" />
						{label}
					</span>
				),
			)}
		</nav>
	);
}
