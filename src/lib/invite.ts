import 'expo-sqlite/localStorage/install';

// Página de convite publicada pelo GitHub Pages a partir da pasta docs/ do repositório.
const INVITE_PAGE_URL = 'https://elyfrank.github.io/bookrats/';
const PENDING_KEY = 'bookrats.pendingInvite';

export function inviteLink(code: string) {
  return `${INVITE_PAGE_URL}?codigo=${encodeURIComponent(code)}`;
}

// Convite aberto antes do login: fica guardado e é usado logo depois que a pessoa entra.
export function savePendingInvite(code: string) {
  try {
    localStorage.setItem(PENDING_KEY, code);
  } catch {}
}

export function peekPendingInvite() {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function takePendingInvite() {
  const code = peekPendingInvite();
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
  return code;
}
