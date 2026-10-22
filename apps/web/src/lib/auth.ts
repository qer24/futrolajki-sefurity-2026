const AUTH_STORAGE_KEY = 'futrolajki-authenticated';

export function isAuthenticated(): boolean {
	return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function setAuthenticated(): void {
	localStorage.setItem(AUTH_STORAGE_KEY, 'true');
}
