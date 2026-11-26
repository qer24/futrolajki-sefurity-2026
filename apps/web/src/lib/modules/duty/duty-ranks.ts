export const RANKS = ['porzadkowa', 'info', 'dowodca'] as const;

export type Rank = (typeof RANKS)[number];

export const RANK_STYLES: Record<Rank, string> = {
	porzadkowa:
		'border-transparent bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
	info: 'border-transparent bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300',
	dowodca:
		'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300'
};

export const RANK_DOTS: Record<Rank, string> = {
	porzadkowa: 'bg-green-500',
	info: 'bg-cyan-500',
	dowodca: 'bg-purple-500'
};

export const NO_RANK_STYLE = 'border-transparent bg-muted text-muted-foreground';

export function isRank(value: string): value is Rank {
	return RANKS.some((rank) => rank === value);
}

export function rankStyle(rank: string | null | undefined): string {
	return rank && isRank(rank) ? RANK_STYLES[rank] : NO_RANK_STYLE;
}
