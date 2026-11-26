import { apiFetch } from '../../api.js';
import type { Rank } from './duty-ranks.js';

export interface ActiveDuty {
	id: number;
	user_id: number;
	start_time: string;
	nickname: string;
	rank: Rank | null;
	tag_nfc: string;
}

export interface EndedDuty extends ActiveDuty {
	end_time: string;
}

export async function loadActiveDuties(): Promise<ActiveDuty[]> {
	const response = await apiFetch('/duty/active');
	if (!response.ok) throw new Error('load failed');
	return response.json();
}

export async function loadDutyHistory(): Promise<EndedDuty[]> {
	const response = await apiFetch('/duty/history');
	if (!response.ok) throw new Error('load failed');
	return response.json();
}
