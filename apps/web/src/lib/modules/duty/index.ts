import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Clock from '@lucide/svelte/icons/clock';

export const dutyModule = {
	id: 'duty',
	title: 'Dyżury',
	items: [
		{ title: 'Duty', href: '/duty' as const, icon: Clock },
		{ title: 'Dashboard', href: '/dashboard' as const, icon: LayoutDashboard },
		{ title: 'Logs', href: '/logs' as const, icon: ScrollText }
	]
};
