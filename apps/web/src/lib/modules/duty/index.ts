import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import ScrollText from '@lucide/svelte/icons/scroll-text';
import Clock from '@lucide/svelte/icons/clock';

export const dutyModule = {
	title: 'Dyżury',
	items: [
		{ title: 'Duty', href: '/duty', icon: Clock },
		{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
		{ title: 'Logs', href: '/logs', icon: ScrollText }
	]
};
