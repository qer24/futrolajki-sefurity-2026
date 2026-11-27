import { apiFetch } from '#lib/api.js';

export interface ModuleAvailability {
	counters: boolean;
}

export async function loadModuleAvailability(): Promise<ModuleAvailability> {
	const response = await apiFetch('/modules');
	if (!response.ok) {
		throw new Error('Unable to load module availability.');
	}

	const result: unknown = await response.json();
	if (
		result === null ||
		typeof result !== 'object' ||
		Array.isArray(result) ||
		!('counters' in result) ||
		typeof result.counters !== 'boolean'
	) {
		throw new Error('Invalid module availability response.');
	}

	return { counters: result.counters };
}
