const AUTH_STORAGE_KEY = 'futrolajki-authenticated';
const PASSWORD_STORAGE_KEY = 'futrolajki-api-password';

export function isAuthenticated(): boolean {
	return (
		localStorage.getItem(AUTH_STORAGE_KEY) === 'true' &&
		Boolean(localStorage.getItem(PASSWORD_STORAGE_KEY))
	);
}

export function setAuthenticated(password: string): void {
	localStorage.setItem(AUTH_STORAGE_KEY, 'true');
	localStorage.setItem(PASSWORD_STORAGE_KEY, password);
}

export function getApiPassword(): string {
	return localStorage.getItem(PASSWORD_STORAGE_KEY) ?? '';
}
