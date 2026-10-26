@AGENTS.md

# Bookrats

App Android (Expo + React Native + TypeScript) de leitura em grupo: a pessoa registra quantas
páginas leu por dia e ganha 1 ponto por página; grupos entram por código de convite e têm ranking.

- Backend: Supabase (auth por e-mail/senha). Banco em `supabase/migrations/NNN_nome.sql`: cada
  mudança é uma migração nova (nunca editar uma já aplicada). O projeto está ligado pelo Supabase CLI:
  `npx supabase migration list --linked` mostra o que falta e `npx supabase db push --linked --dry-run`
  seguido de `npx supabase db push --linked --yes` aplica. Testar o SQL antes (ex.: PGlite) e confirmar com o
  usuário antes de aplicar, pois altera o banco de produção.
- Pontuação é calculada no banco (função `score_days`, migração 004; ranking conta só desde a entrada no grupo), nunca no app.
- Chaves em `.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). O Expo só lê
  variáveis com prefixo `EXPO_PUBLIC_`.
- Consultas ao banco ficam em `src/lib/db.ts`; telas em `src/app/`.
- Convites: link `https://elyfrank.github.io/bookrats/?codigo=XXXXXX` (página em `docs/index.html`, GitHub
  Pages) abre o app em `bookrats://join?code=...` (`src/app/join.tsx`). A cada build novo do APK, atualizar
  `APK_URL` em `docs/index.html`.

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
