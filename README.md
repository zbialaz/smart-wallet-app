# 🧠 Smart Wallet (`smart-wallet-app`)

Aplicativo mobile offline-first de controle financeiro pessoal para consolidar múltiplas contas bancárias (Nubank, Santander, Itaú, Inter, Carteira, etc.), categorizar gastos e receitas, e visualizar o fluxo de caixa mensal.

## 🏗️ Arquitetura (DDD-Lite)

O projeto segue uma abordagem **Domain-Driven Design (DDD-lite)** com regras de negócio puras e testáveis separadas da infraestrutura (SQLite) e da interface (React Native):

```text
smart-wallet-app/
├── docs/
│   ├── project_kickoff.md              # Visão geral, persona, roadmap de 8 fases e stack
│   ├── fase_01_discovery_user_stories.md # Mapa de funcionalidades, 20+ User Stories e MoSCoW
│   ├── fase_02_arquitetura_ddd.md      # Linguagem Ubíqua, Bounded Contexts e Regras (RN-01..RN-11)
│   └── COMMITS.md                      # Documentação detalhada dos commits e entregas
├── src/
│   ├── shared/                         # Primitivos: Money (centavos inteiros), ISODate, Result, DomainError
│   ├── domains/                        # Bounded Contexts (regras puras, repositórios e testes)
│   │   ├── accounts/                   # Contas bancárias e cálculo de saldo (RN-05, RN-07, RN-11)
│   │   ├── categories/                 # Categorias padrão e personalizadas (RN-09)
│   │   ├── transactions/               # CRUD e validação de transações (RN-01..RN-06, RN-10)
│   │   └── dashboard/                  # Agregações mensais e gráfico por categoria (<3% -> Outros)
│   ├── infrastructure/database/        # Migrations SQLite (PRAGMA user_version) e seeds iniciais
│   ├── store/                          # Zustand store + seletores reativos
│   ├── ui/                             # Design System Editorial Orgânico (Warm Paper, Sand & Terracotta)
│   └── app/                            # Rotas Expo Router ((tabs), onboarding, modais de formulário)
└── vitest.config.mts                   # Configuração de testes unitários de domínio
```

---

## 🧰 Tech Stack

- **Mobile Framework:** React Native `0.88` + Expo SDK `58`
- **Linguagem:** TypeScript `6.0`
- **Navegação:** Expo Router (file-based routing)
- **Gerenciamento de Estado:** Zustand `5.0`
- **Persistência Local:** `expo-sqlite` (offline-first, relacional)
- **Visualização de Dados:** `react-native-svg` (Donut Chart interativo)
- **Testes Unitários:** Vitest `5.0` (41 testes cobrindo regras de negócio `RN-01` a `RN-11`)

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Rodar suíte de testes unitários (Vitest)
npm test

# Iniciar servidor de desenvolvimento Expo
npx expo start
```

---

## 📜 Histórico de Commits Documentado

Veja a documentação detalhada de cada commit em [`docs/COMMITS.md`](./docs/COMMITS.md).

| Commit | Tipo / Escopo | Resumo |
|--------|---------------|--------|
| `ca97924` | `init` | Initial commit do repositório |
| `a501e02` | `docs` | Kickoff do projeto, User Stories (Fase 1) e Arquitetura DDD (Fase 2) |
| `f3833b5` | `chore(mobile)` | Scaffold do app Expo React Native com TypeScript, SQLite e Vitest |
| `984de71` | `feat(shared)` | Value Object `Money`, utilitários de data local (`ISODate`) e primitivos |
| `d7ad981` | `feat(domains)` | Domínios `accounts`, `categories`, `transactions` e `dashboard` + testes |
| `aaf768e` | `feat(infra,store)` | Migrations SQLite, seeds de categorias padrão e store Zustand |
| `bb37204` | `feat(ui)` | Design System Editorial Orgânico, `DonutChart` e `WalletPocket` |
| `7087799` | `feat(app)` | Telas Expo Router: Onboarding, Dashboard, Contas e Extrato de Transações |
| `ea60c4b` | `docs` | Documentação da arquitetura, status do MVP e histórico de commits |
| `c32404f` | `refactor(repo)` | Move arquivos da subpasta `mobile/` diretamente para a raiz do repositório |
| `394ef7a` | `feat(ui,theme)` | Implementa Modo Noturno / Dark Mode orgânico (`US-020`) com persistência SQLite |
| `HEAD` | `feat(ui,privacy)` | Modo de ocultar saldo com asteriscos e animação física realista de fechar carteira |
