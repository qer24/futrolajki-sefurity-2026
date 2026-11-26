const API_BASE_URL = 'http://localhost:3001/api';

export function apiUrl(path: string): string {
	return `${API_BASE_URL}${path}`;
}

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
	return fetch(apiUrl(path), {
		...init,
	});
}
