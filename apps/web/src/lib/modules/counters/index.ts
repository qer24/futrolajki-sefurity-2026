import UsersRound from '@lucide/svelte/icons/users-round';

export const countersModule = {
	id: 'counters',
	title: 'Liczniki osób',
	items: [{ title: 'Licznik osób', href: '/counters' as const, icon: UsersRound }]
};
