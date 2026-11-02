# 📜 Documentação de Commits — Smart Wallet

Este documento registra e detalha o histórico de commits do repositório **Smart Wallet**, mapeando cada entrega técnica às fases do projeto, **User Stories (`US-*`)** e **Regras de Negócio (`RN-*`)**.

---

## Visão Geral da Linha do Tempo

| # | Hash | Mensagem (Conventional Commits) | Foco Principal |
|---|------|---------------------------------|----------------|
| 1 | `ca97924` | `Initial commit` | Inicialização do repositório no GitHub |
| 2 | `a501e02` | `docs: add project kickoff, discovery user stories, and DDD architecture` | Documentação das Fases 0, 1 e 2 |
| 3 | `f3833b5` | `chore(mobile): scaffold Expo React Native app with TypeScript, SQLite, and Vitest` | Configuração base do projeto mobile e assets |
| 4 | `984de71` | `feat(shared): implement Money value object, local ISO date utilities, and domain primitives` | Núcleo compartilhado (`Money`, `ISODate`, `Result`) |
| 5 | `d7ad981` | `feat(domains): implement accounts, categories, transactions, and dashboard domain logic` | Bounded Contexts, regras de negócio e repositórios |
| 6 | `aaf768e` | `feat(infra,store): add SQLite schema migrations, default seeds, and Zustand wallet store` | Banco de dados SQLite e estado global Zustand |
| 7 | `bb37204` | `feat(ui): build organic editorial design system, components, donut chart, and wallet pocket` | Design System, componentes visuais e gráficos |
| 8 | `7087799` | `feat(app): implement Expo Router screens for onboarding, dashboard, accounts, and transactions` | Rotas, fluxos de tela e formulários do MVP |
| 9 | `ea60c4b` | `docs: document project architecture, MVP status, and commit history` | Documentação geral no `README.md` e `COMMITS.md` |
| 10 | `c32404f` | `refactor(repo): move mobile app files directly to repository root` | Remoção da subpasta `mobile/`, deixando o app na raiz do repositório |
| 11 | `394ef7a` | `feat(ui,theme): implement organic dark/night mode with SQLite persistence (US-020)` | Paleta noturna Espresso/Couro, `useTheme`, `ThemeToggleButton` e migração v2 |
| 12 | `ee7cc56` | `feat(ui,privacy): implement balance privacy with asterisks and realistic wallet flap physics` | Ocultação de saldo inicial com persistência SQLite |
| 13 | `f20cc33` | `refactor(ui,privacy): keep only asterisks mode for balance privacy` | Simplificação da privacidade de saldo exclusivamente para asteriscos (`R$ ****`) |
| 14 | `72a516e` | `feat(auth): implement user authentication domain, password hashing, and unit tests` | Entidade `User`, validações de cadastro/login/OAuth, `hashPassword` e `UserRepository` |
| 15 | `0da07a6` | `feat(infra,repos): add SQLite migration v3 for users and scope accounts/transactions by user` | Tabela `users`, coluna `user_id` em `accounts`/`transactions` e isolamento por conta |
| 16 | `4c0675f` | `feat(store): add user registration, login, social OAuth, sign out, and account deletion actions` | Actions de autenticação, login social Apple/Google, logout e exclusão na store Zustand |
| 17 | `e662879` | `feat(auth,ui): create light-only Auth screen with Apple/Google login and email registration` | Tela `auth.tsx` forçada no modo claro (`ForcedThemeContext`) com login social e e-mail |
| 18 | `2271a23` | `fix(navigation): keep root Stack mounted during SQLite init to handle ROUTE_NAMES_CHANGED` | Correção do warning `ROUTE_NAMES_CHANGED` mantendo `<Stack>` sempre montado |
| 19 | `8dcc5d0` | `feat(settings,accounts): add dedicated Settings tab and focus Accounts tab on bank accounts` | Nova aba **Configurações** (`settings.tsx`) para conta/tema/privacidade e limpeza da aba **Contas** |
| 20 | `f3538d6` | `feat(i18n): add multi-language support for Portuguese, English, and Spanish` | Internacionalização completa (`pt`, `en`, `es`) com persistência SQLite e tradução de categorias/datas |

---

### 10. `f20cc33` — `refactor(ui,privacy): keep only asterisks mode for balance privacy`
**Arquivos principais:**
- `src/ui/wallet-pocket.tsx`, `src/ui/theme.ts`, `src/store/wallet-store.ts`, `src/app/(tabs)/accounts.tsx`

**O que foi entregue:**
- Ocultação rápida e direta de valores monetários com `R$ ****` no saldo consolidado, receitas, despesas e cartões de contas bancárias, com persistência no SQLite (`balance_hidden`).

---

### 11. `72a516e` — `feat(auth): implement user authentication domain, password hashing, and unit tests`
**Arquivos:**
- `src/domains/auth/user.ts`, `src/domains/auth/user.test.ts`, `src/domains/auth/user-repository.ts`

**O que foi entregue:**
- Validação de nome, normalização de e-mail, política de senha mínima (`>= 6` caracteres) e hash determinístico (`hashPassword`) com suporte a provedores `'email'`, `'google'` e `'apple'`.
- Repositório SQLite (`UserRepository`) para criação, busca por ID/e-mail e exclusão em cascata de usuários.

---

### 12. `0da07a6` — `feat(infra,repos): add SQLite migration v3 for users and scope accounts/transactions by user`
**Arquivos:**
- `src/infrastructure/database/migrations.ts`, `src/domains/accounts/account-repository.ts`, `src/domains/transactions/transaction-repository.ts`

**O que foi entregue:**
- Migração SQLite **v3** criando a tabela `users` e adicionando `user_id` em `accounts` e `transactions`.
- Isolamento completo dos dados financeiros (`listAll(userId)`, `deleteAccount(id)`) por usuário autenticado.

---

### 13. `4c0675f` — `feat(store): add user registration, login, social OAuth, sign out, and account deletion actions`
**Arquivos:**
- `src/store/wallet-store.ts`

**O que foi entregue:**
- Actions `registerUser`, `loginUser`, `loginWithSocial`, `logoutUser`, `deleteCurrentUser` e `deleteBankAccount` integradas ao estado global Zustand e persistência de sessão (`current_user_id`).

---

### 14. `e662879` — `feat(auth,ui): create light-only Auth screen with Apple/Google login and email registration`
**Arquivos:**
- `src/ui/theme.ts`, `src/app/auth.tsx`, `src/app/onboarding.tsx`

**O que foi entregue:**
- `ForcedThemeContext` em `theme.ts` garantindo que a tela de autenticação (`src/app/auth.tsx`) permaneça sempre no modo claro (*Warm Paper*), independentemente do tema global.
- Botões de **Continuar com Apple**, **Continuar com Google**, alternância entre **Entrar** e **Criar Conta** e seletor de contas salvas no dispositivo.

---

### 15. `2271a23` — `fix(navigation): keep root Stack mounted during SQLite init to handle ROUTE_NAMES_CHANGED`
**Arquivos:**
- `src/app/_layout.tsx`

**O que foi entregue:**
- Mantém o `<Stack>` do Expo Router sempre montado durante a inicialização do banco SQLite (exibindo um overlay de carregamento) e gerencia o redirecionamento de autenticação via `useEffect`, eliminando o warning `The action 'ROUTE_NAMES_CHANGED' was not handled by any navigator`.

---

### 16. `8dcc5d0` — `feat(settings,accounts): add dedicated Settings tab and focus Accounts tab on bank accounts`
**Arquivos:**
- `src/app/(tabs)/settings.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/accounts.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/transactions.tsx`

**O que foi entregue:**
- Nova aba **Configurações (`settings.tsx`)** centralizando perfil do usuário (com badge do provedor E-mail/Google/Apple), aparência (**Sistema / Claro / Noturno**), privacidade de saldo (`R$ ****`), resumo de dados locais, **Sair da conta (Sign out)** e **Excluir minha conta permanentemente**.
- Aba **Contas (`accounts.tsx`)** dedicada exclusivamente às contas bancárias, com suporte a editar, arquivar e excluir banco.

---

### 17. `f3538d6` — `feat(i18n): add multi-language support for Portuguese, English, and Spanish`
**Arquivos principais:**
- `src/shared/i18n.ts`, `src/shared/i18n.test.ts`, `src/shared/date.ts`, `src/store/wallet-store.ts`, `src/app/(tabs)/settings.tsx`, `src/app/auth.tsx`

**O que foi entregue:**
- Dicionários completos e tipados para **Português (`pt` 🇧🇷)**, **Inglês (`en` 🇺🇸)** e **Espanhol (`es` 🇪🇸)** cobrindo todas as telas, abas, formulários, modais e categorias padrão (`translateCategory`).
- Formatação localizada de meses (`Outubro 2026` / `October 2026` / `Octubre 2026`) e datas relativas (`Hoje` / `Today` / `Hoy`, `Ontem` / `Yesterday` / `Ayer`).
- Seletor de idioma na aba **Configurações** e no topo da tela de **Login/Cadastro**, com persistência automática no SQLite (`app_language`).

---

## Detalhamento por Commit

### 1. `a501e02` — `docs: add project kickoff, discovery user stories, and DDD architecture`
**Arquivos:**
- `docs/project_kickoff.md`
- `docs/fase_01_discovery_user_stories.md`
- `docs/fase_02_arquitetura_ddd.md`

**O que foi documentado:**
- Definição do problema, persona principal, roadmap de 8 fases e decisão de Tech Stack.
- Mapeamento completo de funcionalidades em 6 domínios e especificação de 20+ User Stories com critérios de aceitação no formato *Given / When / Then* e priorização **MoSCoW**.
- Modelagem **DDD-lite**: Glossário da Linguagem Ubíqua, Bounded Contexts (`accounts`, `categories`, `transactions`, `dashboard`, `insights`, `settings`) e regras de negócio numeradas (`RN-01` a `RN-11`).

---

### 2. `f3833b5` — `chore(mobile): scaffold Expo React Native app with TypeScript, SQLite, and Vitest`
**Arquivos principais:**
- `.gitignore`, `mobile/.gitignore`
- `mobile/package.json`, `mobile/package-lock.json`, `mobile/tsconfig.json`
- `mobile/app.json`, `mobile/metro.config.js`, `mobile/vitest.config.mts`
- `mobile/assets/**` (ícones e textura de couro `leather.jpg`)

**O que foi entregue:**
- Estrutura inicial do app com **Expo SDK 58**, **React 19**, **React Native 0.88** e **Expo Router**.
- Suporte a `.wasm` no `metro.config.js` para execução do `expo-sqlite` também na Web.
- Configuração de aliases TypeScript (`@/* -> ./src/*`) e runner de testes unitários **Vitest**.

---

### 3. `984de71` — `feat(shared): implement Money value object, local ISO date utilities, and domain primitives`
**Arquivos:**
- `mobile/src/shared/money.ts` & `mobile/src/shared/money.test.ts`
- `mobile/src/shared/date.ts` & `mobile/src/shared/date.test.ts`
- `mobile/src/shared/errors.ts`, `mobile/src/shared/id.ts`, `mobile/src/shared/result.ts`, `mobile/src/shared/transaction-type.ts`

**Regras de Negócio e Decisões Técnicas:**
- **RN-02 (`Money`):** Valores monetários armazenados exclusivamente em **centavos inteiros** para eliminar erros de ponto flutuante (`0.1 + 0.2`), com suporte a formatação `pt-BR` (`R$ 1.234,56`) e entrada por dígitos estilo app bancário.
- **Datas locais (`ISODate`):** Representação `'YYYY-MM-DD'` sem fuso horário para evitar deslocamentos UTC-3 na virada do dia, além de navegação entre meses (`'YYYY-MM'`).
- **Tratamento de Erros:** `DomainError` referenciando o código da regra violada e tipo `Result<T, E>` para validações de formulário sem exceptions inesperadas na UI.

---

### 4. `d7ad981` — `feat(domains): implement accounts, categories, transactions, and dashboard domain logic`
**Arquivos:**
- `mobile/src/domains/accounts/account.ts`, `account-repository.ts`, `account.test.ts`
- `mobile/src/domains/categories/category.ts`, `category-repository.ts`
- `mobile/src/domains/transactions/transaction.ts`, `transaction-repository.ts`, `transaction.test.ts`
- `mobile/src/domains/dashboard/summary.ts`, `summary.test.ts`

**Regras de Negócio e User Stories atendidas:**
- **Contas (`US-007`, `US-008`, `RN-05`, `RN-07`, `RN-11`):** Validação de nome único entre contas ativas, saldo inicial não-negativo e cálculo puro do saldo atual (`initialBalance + receitas - gastos`) e saldo consolidado.
- **Categorias (`US-010`, `RN-09`):** 12 categorias padrão pré-configuradas (8 de gasto e 4 de receita) protegidas contra exclusão/edição.
- **Transações (`US-001`..`US-004`, `RN-01`, `RN-03`, `RN-04`, `RN-06`, `RN-10`):** Validação de valor `> 0`, compatibilidade de tipo entre transação e categoria, bloqueio de datas futuras no MVP e bloqueio de novas transações em contas/categorias arquivadas.
- **Dashboard (`US-012`, `US-013`):** Cálculo de receitas, gastos e saldo líquido do mês, e distribuição percentual por categoria agrupando fatias `< 3%` em `"Outros"`.

---

### 5. `aaf768e` — `feat(infra,store): add SQLite schema migrations, default seeds, and Zustand wallet store`
**Arquivos:**
- `mobile/src/infrastructure/database/migrations.ts`
- `mobile/src/store/wallet-store.ts`
- `mobile/src/store/selectors.ts`

**O que foi entregue:**
- Migrations SQLite controladas por `PRAGMA user_version` criando as tabelas `accounts`, `categories` e `transactions` com `FOREIGN KEY` e índices por data, conta e categoria.
- Seed automático das categorias padrão na primeira inicialização.
- Store **Zustand** (`useWallet`) integrando validações de domínio com persistência SQLite e seletores reativos (`useAccountsWithBalance`, `useConsolidatedBalance`, `useMonthSummary`, `useCategoryBreakdown`).

---

### 6. `bb37204` — `feat(ui): build organic editorial design system, components, donut chart, and wallet pocket`
**Arquivos:**
- `mobile/src/ui/theme.ts`, `mobile/src/ui/text.tsx`, `mobile/src/ui/components.tsx`
- `mobile/src/ui/donut-chart.tsx`, `mobile/src/ui/shared-widgets.tsx`, `mobile/src/ui/wallet-pocket.tsx`

**O que foi entregue:**
- **Design System Editorial & Orgânico (`theme.ts`):** Paleta *Warm Paper, Sand & Terracotta* (`#F7F4EE` fundo linho, `#27201B` texto espresso, `#A85A32` terracota, `#2D7252` verde sálvia para receitas, `#BA4337` cereja queimado para gastos).
- **Componentes base (`components.tsx`):** `Screen`, `Card`, `Button`, `AmountInput`, `TextField`, `Chip`, `SegmentedControl`, `IconBadge`, `EmptyState` e `ConfirmSheet`.
- **`WalletPocket` (`wallet-pocket.tsx`):** Componente inspirado em carteira física de couro com costuras pespontadas, cartões bancários táteis e resumo consolidado.
- **`DonutChart` (`donut-chart.tsx`):** Gráfico de rosca interativo em SVG com toque por fatia e legenda detalhada (`US-013`).

---

### 7. `7087799` — `feat(app): implement Expo Router screens for onboarding, dashboard, accounts, and transactions`
**Arquivos:**
- `mobile/src/app/_layout.tsx`, `onboarding.tsx`, `account-form.tsx`, `transaction-form.tsx`
- `mobile/src/app/(tabs)/_layout.tsx`, `index.tsx`, `transactions.tsx`, `accounts.tsx`
- `mobile/src/domains/accounts/account-form.tsx`

**O que foi entregue:**
- Redirecionamento automático no `_layout.tsx` para o fluxo de **Onboarding (`US-023`)** caso o usuário ainda não possua nenhuma conta cadastrada.
- **Tela Início / Dashboard (`(tabs)/index.tsx`):** Exibe `WalletPocket`, `MonthSwitcher`, `DonutChart` de categorias, últimas transações do mês e FAB `+` para nova transação.
- **Tela Extrato (`(tabs)/transactions.tsx`):** Lista seccionada por data com soma diária e acesso rápido à edição.
- **Tela Contas (`(tabs)/accounts.tsx`):** Patrimônio consolidado e cartões individuais por banco com saldo calculado em tempo real.
- **Modal de Transação (`transaction-form.tsx`):** Criação, edição e exclusão com confirmação (`ConfirmSheet`) para gastos e receitas (`US-001` a `US-004`).

---

### 8. `c32404f` — `refactor(repo): move mobile app files directly to repository root`
**O que foi entregue:**
- Todos os arquivos de código (`src/`), configuração (`package.json`, `tsconfig.json`, `app.json`, `metro.config.js`, `vitest.config.mts`) e `assets/` foram movidos de `mobile/` diretamente para a raiz do repositório (`smart-wallet-app/`).
- Remoção do diretório intermediário `mobile/` e do `mobile/README.md` duplicado do template Expo, mantendo o `README.md` principal na raiz.

---

### 9. `feat(ui,theme): implement organic dark/night mode with SQLite persistence (US-020)`
**Arquivos principais:**
- `src/ui/theme.ts`, `src/ui/text.tsx`, `src/ui/components.tsx`, `src/ui/shared-widgets.tsx`, `src/ui/donut-chart.tsx`, `src/ui/wallet-pocket.tsx`
- `src/infrastructure/database/migrations.ts`, `src/store/wallet-store.ts`
- `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/transactions.tsx`, `src/app/(tabs)/accounts.tsx`, `src/app/onboarding.tsx`, `src/app/transaction-form.tsx`, `app.json`

**O que foi entregue:**
- **Paleta Noturna Orgânica (`darkColors`):** Inspirada em *Nocturnal Espresso, Dark Leather & Warm Amber* (`#14110F` fundo café torrado, `#1F1A17` superfície mogno escuro, `#F2ECE4` texto pergaminho, `#D47B4A` terracota luminoso, `#4CA97C` sálvia luminosa e `#E0665A` coral terracota).
- **Hook reativo `useTheme()` (`US-020`):** Suporte aos modos `'system'` (segue preferência do celular via `useColorScheme` e `userInterfaceStyle: "automatic"`), `'light'` e `'dark'`.
- **Persistência SQLite (`US-020.3`):** Migração v2 criando a tabela `settings` para salvar a escolha de tema entre sessões.
- **Controles de Interface (`US-020.1`):** Botão rápido `ThemeToggleButton` nos cabeçalhos das telas principais e seletor completo (`Sistema` / `Claro` / `Noturno`) na aba **Contas**.


