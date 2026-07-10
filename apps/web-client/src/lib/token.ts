export const TOKEN_KEY = 'bytebulletin:action-token';

export function getActionToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) ?? '';
}
