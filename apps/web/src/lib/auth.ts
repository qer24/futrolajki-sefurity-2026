const AUTHENTICATED_KEY = 'admin_authenticated';

export function setAuthenticated(_password: string): void {
	sessionStorage.setItem(AUTHENTICATED_KEY, 'true');
}

export function isAuthenticated(): boolean {
	return sessionStorage.getItem(AUTHENTICATED_KEY) === 'true';
}