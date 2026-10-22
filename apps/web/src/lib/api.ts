import { getApiPassword } from '$lib/auth.js';

const API_BASE_URL = 'http://localhost:3001/api';

export function apiUrl(path: string): string {
	return `${API_BASE_URL}${path}`;
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
	const headers = new Headers(init.headers);
	headers.set('x-api-password', getApiPassword());

	return fetch(apiUrl(path), {
		...init,
		headers
	});
}
