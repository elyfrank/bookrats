@AGENTS.md

# Bookrats

App Android (Expo + React Native + TypeScript) de leitura em grupo: a pessoa registra quantas
páginas leu por dia e ganha 1 ponto por página; grupos entram por código de convite e têm ranking.

- Backend: Supabase (auth por e-mail/senha). Esquema e regras RLS em `supabase/schema.sql` —
  qualquer mudança no banco vai nesse arquivo e precisa ser rodada manualmente no SQL Editor.
- Chaves em `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). O Expo só lê
  variáveis com prefixo `EXPO_PUBLIC_`.
- Consultas ao banco ficam em `src/lib/db.ts`; telas em `src/app/`.

## Ambiente

- WSL2. Node via nvm: o padrão global é v14, então rode `source ~/.nvm/nvm.sh && nvm use` (lê `.nvmrc`,
  Node 24) antes de qualquer comando npm/npx/expo.
- Para testar no celular (Expo Go): `npx expo start --tunnel`.
- GitHub por SSH (`git@github.com:elyfrank/bookrats.git`); HTTPS trava no credential manager do Windows.

## Regras de git

- NUNCA adicionar `Co-Authored-By` nem qualquer linha de atribuição ao Claude em commits ou PRs.
- NUNCA commitar `.claude/`, `.env` ou `.idea/`.
- Só commitar/fazer push quando o usuário pedir.

## Comunicação

- Responder em português.
