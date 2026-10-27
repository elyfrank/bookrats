import 'expo-sqlite/localStorage/install';

// Página de convite publicada pelo GitHub Pages a partir da pasta docs/ do repositório.
const INVITE_PAGE_URL = 'https://elyfrank.github.io/bookrats/';
const PENDING_KEY = 'bookrats.pendingInvite';

const listeners = new Set<() => void>();

export function inviteLink(code: string) {
  return `${INVITE_PAGE_URL}?codigo=${encodeURIComponent(code)}`;
}

// Convite recebido por link: fica guardado até haver alguém logado para entrar no grupo.
export function savePendingInvite(code: string) {
  try {
    localStorage.setItem(PENDING_KEY, code);
  } catch {}
  listeners.forEach((listener) => listener());
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

// Avisa quando chega um convite novo com o app já aberto.
export function onPendingInvite(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
