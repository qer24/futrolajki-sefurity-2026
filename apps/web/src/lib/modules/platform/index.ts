import Shield from '@lucide/svelte/icons/shield';

export const platformModule = {
	id: 'platform',
	title: 'Administracja',
	items: [{ title: 'Admin', href: '/admin' as const, icon: Shield }]
};
