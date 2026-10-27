import { savePendingInvite } from '@/lib/invite';

const JOIN_LINK = /(?:^|[/:])join\?(?:.*&)?code=([A-Za-z0-9]{6})(?:&|$)/;

// Links de convite (bookrats://join?code=XXXXXX) não abrem uma tela própria: o código fica
// guardado e o app abre na tela inicial; quem entra no grupo é o RootStack, assim que houver
// alguém logado. Redirecionar a partir de uma tela aberta pelo link fazia o app entrar em loop.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const code = JOIN_LINK.exec(path)?.[1];
    if (code) {
      savePendingInvite(code.toUpperCase());
      return '/';
    }
  } catch {
    // Nunca deixar um link estranho derrubar o app.
  }
  return path;
}
