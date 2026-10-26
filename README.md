<p align="center">
  <img src="public/logo/logo-arredondado-512.png" alt="Logo do BookRats" width="128" />
</p>

<h1 align="center">BookRats</h1>

<p align="center">Leia com seus amigos e suba no ranking.</p>

BookRats é um app Android de leitura em grupo. Cada pessoa registra quantas páginas leu no dia,
ganha pontos e disputa o ranking com os amigos em grupos fechados por código de convite.

## Funcionalidades

- **Conta com e-mail e senha**. A confirmação por código enviado por e-mail também está pronta, mas fica desligada até o projeto ter SMTP próprio (veja abaixo).
- **Registro diário de leitura**: páginas lidas e o livro, com histórico por dia e o detalhe de onde veio cada ponto.
- **Livros**: lista do que você está lendo e botão **Concluí** quando terminar.
- **Grupos** com código de convite de 6 letras e **ranking** geral ou dos últimos 7 dias, mostrando a sequência 🔥 de cada pessoa.
- **Configurações**: editar o nome, tema claro, escuro ou do sistema, regras de pontuação e sair da conta.

## Pontuação

As regras premiam a constância: ler um pouco todo dia vale mais do que ler muito de uma vez só.

| Regra | Pontos |
|---|---|
| 📄 Páginas | 1 ponto por página até 50 no dia; depois, 0,5 por página, com no máximo 100 pontos por dia |
| ✅ Leitura do dia | +10 ao ler pelo menos 5 páginas no dia |
| 🔥 Sequência | +2 por dia seguido lendo 5 ou mais páginas, até +20 a partir do 10º dia |
| 🏁 Livro concluído | +30 ao concluir um livro com pelo menos 50 páginas registradas |

**Nos grupos**, só contam as leituras e os livros concluídos **depois da entrada** da pessoa no grupo.
A sequência começa do zero no grupo, e sair e entrar de novo reinicia a contagem. Os pontos totais,
na aba Leitura, continuam contando todo o histórico.

Os pontos são calculados **no banco de dados** (função `score_days`), nunca no app. Assim ninguém
consegue alterar os próprios pontos, e uma mudança nas regras recalcula todo o histórico.

## Tecnologias

- [Expo](https://expo.dev) (SDK 58) e React Native, com TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) para a navegação
- [Supabase](https://supabase.com): autenticação, banco Postgres e regras de segurança (RLS)
- [EAS Build](https://docs.expo.dev/build/introduction/) para gerar o APK na nuvem

## Estrutura

```
src/
  app/                  telas (Expo Router: cada arquivo é uma rota)
    (tabs)/             abas Leitura, Grupos e Configurações
    group/[id].tsx      ranking de um grupo
    rules.tsx           regras de pontuação
    sign-in.tsx         login, cadastro e confirmação por código
  lib/
    db.ts               todas as consultas ao banco
    supabase.ts         cliente do Supabase
    auth.tsx            sessão do usuário
    ui.tsx              tema (claro/escuro) e componentes básicos
supabase/
  migrations/           mudanças no banco, numeradas e aplicadas em ordem
public/
  logo/                 logo e ícones do app
  icones/               ícones das abas
```

## Como rodar

### Pré-requisitos

- Node.js 24 (o projeto tem `.nvmrc`; com nvm, rode `nvm use`)
- Um projeto no [Supabase](https://supabase.com)
- O app **Expo Go** no celular Android
- Uma conta [Expo](https://expo.dev), necessária para o túnel e para os builds

### 1. Instalar as dependências

```bash
nvm use
npm install
```

### 2. Configurar o Supabase

Copie `.env.example` para `.env` e preencha com os dados do seu projeto, que ficam em
*Project Settings → API Keys*:

```
EXPO_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use só a chave **publishable**. Nunca coloque a chave secreta nem a senha do banco no app.

### 3. Criar o banco

Com o [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push --linked
```

Se preferir não usar o CLI, cole cada arquivo de `supabase/migrations/` no **SQL Editor** do
Supabase, em ordem (001, 002, …).

### Confirmação de e-mail

Hoje a confirmação de e-mail está **desligada** (*Authentication → Sign In / Providers → Email →
Confirm email*): quem se cadastra entra direto. O motivo é que o servidor de e-mail gratuito do
Supabase só envia o template padrão, em inglês e com um link que não abre o app, e não permite
editar os templates.

Para ligar a confirmação:

1. Configure um SMTP próprio em *Authentication → Emails → Set up SMTP* (por exemplo, o Gmail com
   uma senha de app, ou um serviço como o Resend).
2. Edite o template *Confirm signup* para enviar o **código** `{{ .Token }}` em vez do link.
3. Ligue de novo o **Confirm email**.

O app já trata esse fluxo: depois do cadastro, ele pede o código e tem um botão para reenviá-lo.

### 4. Abrir no celular

```bash
npx expo login
npx expo start --tunnel
```

Abra o **Expo Go** com a mesma conta e escolha o projeto, ou escaneie o QR code.

> **No WSL:** se o `npx expo login` der erro ao abrir o navegador, rode
> `BROWSER=none npx expo login` e abra o link manualmente.

## Gerar o APK

As variáveis do `.env` não vão para a nuvem. Por isso, elas precisam estar cadastradas no EAS
(uma vez só):

```bash
npx eas-cli@latest env:set preview --name EXPO_PUBLIC_SUPABASE_URL --value "<url>" --visibility plaintext
npx eas-cli@latest env:set preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<chave>" --visibility sensitive
```

Depois:

```bash
npx eas-cli@latest build -p android --profile preview
```

Quando o build terminar, o EAS mostra o link para baixar o `.apk` e instalar no celular.

## Mudanças no banco

Cada mudança no banco é uma **migração nova** em `supabase/migrations/NNN_nome.sql`. Nunca edite
uma migração que já foi aplicada. Para ver e aplicar as pendentes:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run   # simula
npx supabase db push --linked             # aplica
```

## Comandos úteis

```bash
npx expo start --tunnel   # servidor de desenvolvimento
npx tsc --noEmit          # checagem de tipos
npx expo lint             # lint
npx expo-doctor           # diagnóstico de dependências e configuração
```
