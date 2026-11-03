import { create } from 'zustand';

export type AppLanguage = 'pt' | 'en' | 'es';

export const LANGUAGE_OPTIONS: {
  code: AppLanguage;
  label: string;
  nativeName: string;
  flag: string;
}[] = [
  { code: 'pt', label: 'Português', nativeName: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en', label: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { code: 'es', label: 'Español', nativeName: 'Español', flag: '🇪🇸' },
];

/**
 * Tradução das categorias padrão por ID ou nome em português.
 */
const CATEGORY_TRANSLATIONS: Record<string, Record<AppLanguage, string>> = {
  'cat-food': { pt: 'Alimentação', en: 'Food & Dining', es: 'Alimentación' },
  'cat-transport': { pt: 'Transporte', en: 'Transport', es: 'Transporte' },
  'cat-home': { pt: 'Moradia', en: 'Housing', es: 'Vivienda' },
  'cat-health': { pt: 'Saúde', en: 'Health', es: 'Salud' },
  'cat-education': { pt: 'Educação', en: 'Education', es: 'Educación' },
  'cat-leisure': { pt: 'Lazer', en: 'Leisure', es: 'Ocio' },
  'cat-shopping': { pt: 'Compras', en: 'Shopping', es: 'Compras' },
  'cat-subscriptions': { pt: 'Assinaturas', en: 'Subscriptions', es: 'Suscripciones' },
  'cat-personal-care': { pt: 'Cuidados Pessoais', en: 'Personal Care', es: 'Cuidado Personal' },
  'cat-tech': { pt: 'Tecnologia', en: 'Technology', es: 'Tecnología' },
  'cat-gifts': { pt: 'Presentes', en: 'Gifts', es: 'Regalos' },
  'cat-other': { pt: 'Outros', en: 'Other', es: 'Otros' },
  'cat-salary': { pt: 'Salário', en: 'Salary', es: 'Salario' },
  'cat-freelance': { pt: 'Freelance', en: 'Freelance', es: 'Freelance' },
  'cat-investments': { pt: 'Investimentos', en: 'Investments', es: 'Inversiones' },
  'cat-gift-received': { pt: 'Presente Recebido', en: 'Gift Received', es: 'Regalo Recibido' },
  'cat-other-income': { pt: 'Outras Receitas', en: 'Other Income', es: 'Otros Ingresos' },
};

export function translateCategory(
  categoryIdOrName: string,
  fallbackName: string,
  lang: AppLanguage,
): string {
  const byId = CATEGORY_TRANSLATIONS[categoryIdOrName];
  if (byId) return byId[lang];
  // Fallback por nome só quando NÃO recebemos um id (categorias personalizadas têm id próprio
  // e nunca devem ser traduzidas, mesmo que o nome coincida com uma padrão).
  if (categoryIdOrName === fallbackName) {
    const byPtName = Object.values(CATEGORY_TRANSLATIONS).find((entry) => entry.pt === fallbackName);
    if (byPtName) return byPtName[lang];
  }
  return fallbackName;
}

const pt = {
  tabs: {
    home: 'Início',
    transactions: 'Transações',
    accounts: 'Contas',
    settings: 'Configurações',
  },
  common: {
    close: 'Fechar',
    cancel: 'Cancelar',
    save: 'Salvar',
    saveChanges: 'Salvar alterações',
    delete: 'Excluir',
    continue: 'Continuar',
    today: 'Hoje',
    yesterday: 'Ontem',
    light: 'Claro',
    dark: 'Noturno',
    system: 'Sistema',
  },
  dashboard: {
    distribution: 'DISTRIBUIÇÃO',
    noExpensesTitle: 'Sem despesas no mês',
    noExpensesMessage: 'Seus gastos categorizados aparecerão aqui de forma clara.',
    transactionsSection: 'TRANSAÇÕES',
    seeAll: (count: number) => `Ver todas (${count})`,
    noTransactionsThisMonth: 'Nenhuma movimentação neste mês.',
    totalSpent: 'Total gasto',
    compareUp: (percent: number) => `↑ ${percent}% em relação ao mês passado`,
    compareDown: (percent: number) => `↓ ${percent}% em relação ao mês passado`,
    compareSame: 'Igual ao mês passado',
    compareNoData: 'Sem dados do mês anterior',
    compareTitle: 'GASTOS DO MÊS',
    evolutionTitle: 'EVOLUÇÃO DE GASTOS',
    evolutionHint: 'Toque em uma barra para ver o detalhamento por categoria',
    evolutionNoExpenses: 'Sem gastos neste mês',
    evolutionTotal: 'Total gasto',
    budgetCardTitle: 'META DO MÊS',
    budgetSpentOf: (spent: string, budget: string) => `${spent} de ${budget}`,
    budgetRemaining: (value: string) => `Restam ${value}`,
    budgetExceededBy: (value: string) => `Excedeu em ${value}`,
    insightTitle: 'RESUMO INTELIGENTE',
    insightNeedMoreData: (current: number, required: number) =>
      `Registre pelo menos ${required} transações neste mês (atual: ${current}) para desbloquear a análise inteligente dos seus gastos.`,
    insightNoExpenses: (income: string) =>
      `Você registrou ${income} em entradas e nenhum gasto neste mês. Excelente preservação de caixa!`,
    insightBody: (params: {
      name: string;
      monthLabel: string;
      totalExpense: string;
      topCategory: string;
      topPercentage: number;
      trendSentence: string;
      tipSentence: string;
    }) =>
      `${params.name}, em ${params.monthLabel} você gastou ${params.totalExpense}. ${params.topCategory} foi sua maior categoria (${params.topPercentage}%). ${params.trendSentence} ${params.tipSentence}`.trim(),
    insightTrendUp: (percent: number) =>
      `Seus gastos subiram ${percent}% em relação ao mês passado.`,
    insightTrendDown: (percent: number) =>
      `Você reduziu seus gastos em ${percent}% em relação ao mês passado!`,
    insightTrendSame: 'Seus gastos ficaram estáveis em relação ao mês passado.',
    insightTipSavings: (rate: number) =>
      rate >= 20
        ? `Você economizou ${rate}% da sua renda neste mês — ótimo ritmo!`
        : rate >= 0
          ? `Você poupou ${rate}% da renda; revisar a maior categoria pode aumentar sua margem.`
          : 'Atenção: as saídas superaram as entradas neste mês.',
  },
  wallet: {
    cardBalance: 'SALDO',
    newAccountSlot: 'Nova conta',
    showValues: 'Mostrar',
    hideValues: 'Ocultar',
    consolidatedBalance: 'SALDO CONSOLIDADO',
    monthlyIncome: 'ENTRADAS DO MÊS',
    monthlyExpense: 'SAÍDAS DO MÊS',
  },
  transactions: {
    title: 'Transações',
    emptyTitle: 'Nenhuma transação',
    emptyMessage: 'Neste mês você ainda não registrou nada.',
    registerNow: 'Registrar agora',
    fallbackTransaction: 'Transação',
    fallbackAccount: 'Conta',
    newTitle: 'Nova transação',
    editTitle: 'Editar transação',
    expense: 'Gasto',
    income: 'Receita',
    amountLabel: 'Valor',
    descriptionLabel: 'Descrição (opcional)',
    descriptionPlaceholder: 'Ex.: iFood, mercado, salário…',
    categoryLabel: 'Categoria',
    accountLabel: 'Conta',
    dateLabel: 'Data',
    dateFormatError: 'Use o formato DD/MM/AAAA',
    deleteTransactionBtn: 'Excluir transação',
    deleteConfirmTitle: 'Excluir transação?',
    deleteConfirmMessage: 'Essa ação não pode ser desfeita e o saldo da conta será ajustado.',
    searchPlaceholder: 'Buscar por descrição (ex.: ifood)',
    filterCategoryLabel: 'CATEGORIA',
    filterAccountLabel: 'CONTA',
    filterAll: 'Todas',
    noResultsTitle: 'Nada encontrado',
    noResultsMessage: 'Nenhuma transação combina com os filtros aplicados.',
    clearFilters: 'Limpar filtros',
    resultsCount: (count: number) => `${count} ${count === 1 ? 'resultado' : 'resultados'}`,
    autoSuggestedBadge: 'Sugerida automaticamente',
    learnedBadge: 'Aprendida com você',
  },
  accounts: {
    title: 'Contas Bancárias',
    consolidatedPrefix: 'Saldo consolidado:',
    currentBalance: 'Saldo atual',
    addBankAccount: 'Adicionar conta bancária',
    deleteTitle: (name: string) => `Excluir ${name}?`,
    deleteMessage: 'A conta bancária e todas as transações vinculadas a ela serão removidas.',
    deleteConfirmBtn: 'Excluir conta',
    newAccountModalTitle: 'Nova conta',
    createAccountSubmit: 'Cadastrar conta',
    mostUsedBankLabel: 'Banco mais usado',
    accountNameLabel: 'Nome / apelido da conta',
    accountNamePlaceholder: 'Ex.: Nubank, Carteira…',
    initialBalanceLabel: 'Saldo inicial',
  },
  onboarding: {
    greeting: (name: string) => `Olá, ${name}!`,
    defaultUser: 'você',
    subtitle:
      'Vamos começar cadastrando sua primeira conta bancária. Você pode adicionar outras depois.',
    startButton: 'Começar',
    signOut: 'Sair',
  },
  categories: {
    title: 'Categorias',
    subtitle: 'Crie categorias personalizadas para organizar seus gastos e receitas.',
    customSection: 'PERSONALIZADAS',
    defaultSection: 'PADRÃO',
    newCategory: 'Nova categoria',
    emptyCustom: 'Você ainda não criou categorias personalizadas.',
    defaultLocked: 'Padrão',
    formNewTitle: 'Nova categoria',
    formEditTitle: 'Editar categoria',
    nameLabel: 'Nome da categoria',
    namePlaceholder: 'Ex.: Pet, Academia…',
    typeLabel: 'Tipo',
    iconLabel: 'Ícone',
    colorLabel: 'Cor',
    createSubmit: 'Criar categoria',
    removeTitle: (name: string) => `Remover ${name}?`,
    removeMessage:
      'Se houver transações nesta categoria, ela será arquivada e o histórico preservado. Sem transações, será excluída.',
    removeConfirm: 'Remover',
    edit: 'Editar',
  },
  auth: {
    loginSubtitle: 'Entre na sua conta para acessar suas finanças.',
    registerSubtitle: 'Crie sua conta pessoal para organizar seus bancos e gastos.',
    continueWithApple: 'Continuar com a Apple',
    continueWithGoogle: 'Continuar com o Google',
    orWithEmail: 'OU COM SEU E-MAIL',
    loginTab: 'Entrar',
    registerTab: 'Criar conta',
    yourNameLabel: 'Seu nome',
    yourNamePlaceholder: 'Ex.: Eduardo Bialas',
    emailLabel: 'E-mail',
    emailPlaceholder: 'seu@email.com',
    passwordLabel: 'Senha',
    passwordRegisterPlaceholder: 'Mínimo de 6 caracteres',
    passwordLoginPlaceholder: 'Sua senha',
    confirmPasswordLabel: 'Confirmar senha',
    confirmPasswordPlaceholder: 'Repita a senha',
    submitLogin: 'Entrar na carteira',
    submitRegister: 'Criar minha conta',
    noAccountPrompt: 'Ainda não tem uma conta? ',
    noAccountAction: 'Cadastre-se',
    hasAccountPrompt: 'Já possui uma conta? ',
    hasAccountAction: 'Fazer login',
    appleSheetTitle: 'Iniciar sessão com a Apple',
    googleSheetTitle: 'Fazer login com o Google',
    appleSheetSubtitle: 'Use seu ID Apple para entrar no Smart Wallet',
    googleSheetSubtitle: 'Escolha sua Conta do Google para continuar',
    accountNameField: 'Nome da conta',
    appleEmailField: 'ID Apple (E-mail)',
    googleEmailField: 'E-mail do Google',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Gerencie sua conta, idioma, aparência, privacidade e preferências.',
    connectedProfile: 'PERFIL CONECTADO',
    changeNameLabel: 'Alterar seu nome',
    yourNamePlaceholder: 'Seu nome',
    languageTitle: 'Idioma do Aplicativo',
    languageSubtitle: 'Escolha o idioma da interface',
    appearanceTitle: 'Aparência e Tema',
    darkModeActive: 'Modo Noturno ativo',
    lightModeActive: 'Modo Claro ativo',
    themeSystemDesc: 'Segue o celular',
    themeLightDesc: 'Linho & Papel',
    themeDarkDesc: 'Café & Couro',
    hideBalancesTitle: 'Ocultar Saldos',
    hideBalancesDesc: (mask: string) => `Substitui valores por asteriscos (${mask})`,
    hiddenChip: 'Oculto',
    visibleChip: 'Visível',
    walletSummarySection: 'RESUMO DA CARTEIRA',
    bankAccountsCount: (count: number) =>
      `${count} ${count === 1 ? 'conta bancária' : 'contas bancárias'}`,
    activeCategoriesCount: (count: number) => `${count} categorias ativas`,
    activeCategoriesDesc: 'Categorias padrão de receitas e gastos',
    manageCategories: 'Gerenciar categorias',
    budgetTitle: 'Meta de gastos mensal',
    budgetDesc: 'Defina um limite para acompanhar seu orçamento no Início',
    budgetSave: 'Salvar meta',
    budgetRemove: 'Remover meta',
    budgetCurrent: (value: string) => `Meta atual: ${value}`,
    budgetNone: 'Nenhuma meta definida',
    sessionSection: 'SESSÃO E SEGURANÇA DA CONTA',
    signOutBtn: 'Sair da conta (Sign out)',
    deleteAccountBtn: 'Excluir minha conta permanentemente',
    deleteAccountConfirmTitle: 'Excluir sua conta permanentemente?',
    deleteAccountConfirmMessage:
      'Todos os seus dados, contas bancárias e transações serão apagados definitivamente deste dispositivo.',
    deleteAccountConfirmBtn: 'Excluir tudo',
  },
};

export type Translations = typeof pt;

const en: Translations = {
  tabs: {
    home: 'Home',
    transactions: 'Transactions',
    accounts: 'Accounts',
    settings: 'Settings',
  },
  common: {
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    saveChanges: 'Save changes',
    delete: 'Delete',
    continue: 'Continue',
    today: 'Today',
    yesterday: 'Yesterday',
    light: 'Light',
    dark: 'Night',
    system: 'System',
  },
  dashboard: {
    distribution: 'BREAKDOWN',
    noExpensesTitle: 'No expenses this month',
    noExpensesMessage: 'Your categorized expenses will appear clearly here.',
    transactionsSection: 'TRANSACTIONS',
    seeAll: (count: number) => `See all (${count})`,
    noTransactionsThisMonth: 'No activity this month.',
    totalSpent: 'Total spent',
    compareUp: (percent: number) => `↑ ${percent}% vs. last month`,
    compareDown: (percent: number) => `↓ ${percent}% vs. last month`,
    compareSame: 'Same as last month',
    compareNoData: 'No data from last month',
    compareTitle: 'MONTHLY SPENDING',
    evolutionTitle: 'SPENDING TREND',
    evolutionHint: 'Tap a bar to see the breakdown by category',
    evolutionNoExpenses: 'No expenses this month',
    evolutionTotal: 'Total spent',
    budgetCardTitle: 'MONTHLY GOAL',
    budgetSpentOf: (spent: string, budget: string) => `${spent} of ${budget}`,
    budgetRemaining: (value: string) => `${value} left`,
    budgetExceededBy: (value: string) => `Over by ${value}`,
    insightTitle: 'SMART SUMMARY',
    insightNeedMoreData: (current: number, required: number) =>
      `Record at least ${required} transactions this month (current: ${current}) to unlock your smart spending analysis.`,
    insightNoExpenses: (income: string) =>
      `You recorded ${income} in income and zero expenses this month. Great cash preservation!`,
    insightBody: (params: {
      name: string;
      monthLabel: string;
      totalExpense: string;
      topCategory: string;
      topPercentage: number;
      trendSentence: string;
      tipSentence: string;
    }) =>
      `${params.name}, in ${params.monthLabel} you spent ${params.totalExpense}. ${params.topCategory} was your top category (${params.topPercentage}%). ${params.trendSentence} ${params.tipSentence}`.trim(),
    insightTrendUp: (percent: number) =>
      `Your spending increased by ${percent}% compared to last month.`,
    insightTrendDown: (percent: number) =>
      `You cut your spending by ${percent}% compared to last month!`,
    insightTrendSame: 'Your spending stayed steady compared to last month.',
    insightTipSavings: (rate: number) =>
      rate >= 20
        ? `You saved ${rate}% of your income this month — great pace!`
        : rate >= 0
          ? `You saved ${rate}% of your income; trimming your top category can boost your margin.`
          : 'Heads up: expenses exceeded your income this month.',
  },
  wallet: {
    cardBalance: 'BALANCE',
    newAccountSlot: 'New account',
    showValues: 'Show',
    hideValues: 'Hide',
    consolidatedBalance: 'TOTAL BALANCE',
    monthlyIncome: 'MONTHLY INCOME',
    monthlyExpense: 'MONTHLY EXPENSES',
  },
  transactions: {
    title: 'Transactions',
    emptyTitle: 'No transactions',
    emptyMessage: 'You have not recorded any transactions this month.',
    registerNow: 'Add transaction',
    fallbackTransaction: 'Transaction',
    fallbackAccount: 'Account',
    newTitle: 'New transaction',
    editTitle: 'Edit transaction',
    expense: 'Expense',
    income: 'Income',
    amountLabel: 'Amount',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'E.g.: Groceries, Uber, Salary…',
    categoryLabel: 'Category',
    accountLabel: 'Account',
    dateLabel: 'Date',
    dateFormatError: 'Use format DD/MM/YYYY',
    deleteTransactionBtn: 'Delete transaction',
    deleteConfirmTitle: 'Delete transaction?',
    deleteConfirmMessage: 'This action cannot be undone and your account balance will be updated.',
    searchPlaceholder: 'Search by description (e.g. uber)',
    filterCategoryLabel: 'CATEGORY',
    filterAccountLabel: 'ACCOUNT',
    filterAll: 'All',
    noResultsTitle: 'Nothing found',
    noResultsMessage: 'No transaction matches the applied filters.',
    clearFilters: 'Clear filters',
    resultsCount: (count: number) => `${count} ${count === 1 ? 'result' : 'results'}`,
    autoSuggestedBadge: 'Auto-suggested',
    learnedBadge: 'Learned from you',
  },
  accounts: {
    title: 'Bank Accounts',
    consolidatedPrefix: 'Total balance:',
    currentBalance: 'Current balance',
    addBankAccount: 'Add bank account',
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteMessage: 'This bank account and all transactions linked to it will be removed.',
    deleteConfirmBtn: 'Delete account',
    newAccountModalTitle: 'New account',
    createAccountSubmit: 'Create account',
    mostUsedBankLabel: 'Popular banks',
    accountNameLabel: 'Account name / nickname',
    accountNamePlaceholder: 'E.g.: Checking, Cash Wallet…',
    initialBalanceLabel: 'Initial balance',
  },
  onboarding: {
    greeting: (name: string) => `Hello, ${name}!`,
    defaultUser: 'there',
    subtitle: 'Let’s start by adding your first bank account. You can add more accounts later.',
    startButton: 'Get started',
    signOut: 'Sign out',
  },
  categories: {
    title: 'Categories',
    subtitle: 'Create custom categories to organize your expenses and income.',
    customSection: 'CUSTOM',
    defaultSection: 'DEFAULT',
    newCategory: 'New category',
    emptyCustom: 'You have not created custom categories yet.',
    defaultLocked: 'Default',
    formNewTitle: 'New category',
    formEditTitle: 'Edit category',
    nameLabel: 'Category name',
    namePlaceholder: 'E.g.: Pets, Gym…',
    typeLabel: 'Type',
    iconLabel: 'Icon',
    colorLabel: 'Color',
    createSubmit: 'Create category',
    removeTitle: (name: string) => `Remove ${name}?`,
    removeMessage:
      'If this category has transactions it will be archived and your history preserved. Without transactions it will be deleted.',
    removeConfirm: 'Remove',
    edit: 'Edit',
  },
  auth: {
    loginSubtitle: 'Sign in to your account to access your finances.',
    registerSubtitle: 'Create your personal account to organize your banks and expenses.',
    continueWithApple: 'Continue with Apple',
    continueWithGoogle: 'Continue with Google',
    orWithEmail: 'OR WITH YOUR EMAIL',
    loginTab: 'Sign in',
    registerTab: 'Create account',
    yourNameLabel: 'Your name',
    yourNamePlaceholder: 'E.g.: Eduardo Bialas',
    emailLabel: 'Email',
    emailPlaceholder: 'you@email.com',
    passwordLabel: 'Password',
    passwordRegisterPlaceholder: 'At least 6 characters',
    passwordLoginPlaceholder: 'Your password',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Repeat your password',
    submitLogin: 'Sign in to wallet',
    submitRegister: 'Create my account',
    noAccountPrompt: "Don't have an account yet? ",
    noAccountAction: 'Sign up',
    hasAccountPrompt: 'Already have an account? ',
    hasAccountAction: 'Sign in',
    appleSheetTitle: 'Sign in with Apple',
    googleSheetTitle: 'Sign in with Google',
    appleSheetSubtitle: 'Use your Apple ID to sign in to Smart Wallet',
    googleSheetSubtitle: 'Choose your Google Account to continue',
    accountNameField: 'Account name',
    appleEmailField: 'Apple ID (Email)',
    googleEmailField: 'Google Email',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Manage your account, language, appearance, privacy, and preferences.',
    connectedProfile: 'CONNECTED PROFILE',
    changeNameLabel: 'Change your name',
    yourNamePlaceholder: 'Your name',
    languageTitle: 'App Language',
    languageSubtitle: 'Choose the interface language',
    appearanceTitle: 'Appearance & Theme',
    darkModeActive: 'Night Mode active',
    lightModeActive: 'Light Mode active',
    themeSystemDesc: 'Matches device',
    themeLightDesc: 'Linen & Paper',
    themeDarkDesc: 'Espresso & Leather',
    hideBalancesTitle: 'Hide Balances',
    hideBalancesDesc: (mask: string) => `Replaces amounts with asterisks (${mask})`,
    hiddenChip: 'Hidden',
    visibleChip: 'Visible',
    walletSummarySection: 'WALLET SUMMARY',
    bankAccountsCount: (count: number) =>
      `${count} ${count === 1 ? 'bank account' : 'bank accounts'}`,
    activeCategoriesCount: (count: number) => `${count} active categories`,
    activeCategoriesDesc: 'Default income and expense categories',
    manageCategories: 'Manage categories',
    budgetTitle: 'Monthly spending goal',
    budgetDesc: 'Set a limit to track your budget on the Home tab',
    budgetSave: 'Save goal',
    budgetRemove: 'Remove goal',
    budgetCurrent: (value: string) => `Current goal: ${value}`,
    budgetNone: 'No goal set',
    sessionSection: 'SESSION & ACCOUNT SECURITY',
    signOutBtn: 'Sign out',
    deleteAccountBtn: 'Delete my account permanently',
    deleteAccountConfirmTitle: 'Delete your account permanently?',
    deleteAccountConfirmMessage:
      'All of your data, bank accounts, and transactions will be permanently erased from this device.',
    deleteAccountConfirmBtn: 'Delete everything',
  },
};

const es: Translations = {
  tabs: {
    home: 'Inicio',
    transactions: 'Transacciones',
    accounts: 'Cuentas',
    settings: 'Ajustes',
  },
  common: {
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    saveChanges: 'Guardar cambios',
    delete: 'Eliminar',
    continue: 'Continuar',
    today: 'Hoy',
    yesterday: 'Ayer',
    light: 'Claro',
    dark: 'Nocturno',
    system: 'Sistema',
  },
  dashboard: {
    distribution: 'DISTRIBUCIÓN',
    noExpensesTitle: 'Sin gastos este mes',
    noExpensesMessage: 'Tus gastos categorizados aparecerán aquí con claridad.',
    transactionsSection: 'TRANSACCIONES',
    seeAll: (count: number) => `Ver todas (${count})`,
    noTransactionsThisMonth: 'Sin movimientos en este mes.',
    totalSpent: 'Total gastado',
    compareUp: (percent: number) => `↑ ${percent}% respecto al mes pasado`,
    compareDown: (percent: number) => `↓ ${percent}% respecto al mes pasado`,
    compareSame: 'Igual que el mes pasado',
    compareNoData: 'Sin datos del mes anterior',
    compareTitle: 'GASTOS DEL MES',
    evolutionTitle: 'EVOLUCIÓN DE GASTOS',
    evolutionHint: 'Toca una barra para ver el detalle por categoría',
    evolutionNoExpenses: 'Sin gastos en este mes',
    evolutionTotal: 'Total gastado',
    budgetCardTitle: 'META DEL MES',
    budgetSpentOf: (spent: string, budget: string) => `${spent} de ${budget}`,
    budgetRemaining: (value: string) => `Quedan ${value}`,
    budgetExceededBy: (value: string) => `Excedido en ${value}`,
    insightTitle: 'RESUMEN INTELIGENTE',
    insightNeedMoreData: (current: number, required: number) =>
      `Registra al menos ${required} transacciones este mes (actual: ${current}) para desbloquear el análisis inteligente de tus gastos.`,
    insightNoExpenses: (income: string) =>
      `Registraste ${income} en ingresos y ningún gasto este mes. ¡Excelente preservación de efectivo!`,
    insightBody: (params: {
      name: string;
      monthLabel: string;
      totalExpense: string;
      topCategory: string;
      topPercentage: number;
      trendSentence: string;
      tipSentence: string;
    }) =>
      `${params.name}, en ${params.monthLabel} gastaste ${params.totalExpense}. ${params.topCategory} fue tu mayor categoría (${params.topPercentage}%). ${params.trendSentence} ${params.tipSentence}`.trim(),
    insightTrendUp: (percent: number) =>
      `Tus gastos subieron un ${percent}% respecto al mes pasado.`,
    insightTrendDown: (percent: number) =>
      `¡Redujiste tus gastos un ${percent}% respecto al mes pasado!`,
    insightTrendSame: 'Tus gastos se mantuvieron estables respecto al mes pasado.',
    insightTipSavings: (rate: number) =>
      rate >= 20
        ? `Ahorraste el ${rate}% de tus ingresos este mes — ¡excelente ritmo!`
        : rate >= 0
          ? `Ahorraste el ${rate}% de tus ingresos; revisar tu mayor categoría puede ampliar tu margen.`
          : 'Atención: los gastos superaron a los ingresos este mes.',
  },
  wallet: {
    cardBalance: 'SALDO',
    newAccountSlot: 'Nueva cuenta',
    showValues: 'Mostrar',
    hideValues: 'Ocultar',
    consolidatedBalance: 'SALDO CONSOLIDADO',
    monthlyIncome: 'INGRESOS DEL MES',
    monthlyExpense: 'GASTOS DEL MES',
  },
  transactions: {
    title: 'Transacciones',
    emptyTitle: 'Ninguna transacción',
    emptyMessage: 'Este mes aún no has registrado movimientos.',
    registerNow: 'Registrar ahora',
    fallbackTransaction: 'Transacción',
    fallbackAccount: 'Cuenta',
    newTitle: 'Nueva transacción',
    editTitle: 'Editar transacción',
    expense: 'Gasto',
    income: 'Ingreso',
    amountLabel: 'Monto',
    descriptionLabel: 'Descripción (opcional)',
    descriptionPlaceholder: 'Ej.: Supermercado, Uber, Salario…',
    categoryLabel: 'Categoría',
    accountLabel: 'Cuenta',
    dateLabel: 'Fecha',
    dateFormatError: 'Usa el formato DD/MM/AAAA',
    deleteTransactionBtn: 'Eliminar transacción',
    deleteConfirmTitle: '¿Eliminar transacción?',
    deleteConfirmMessage: 'Esta acción no se puede deshacer y el saldo de la cuenta se ajustará.',
    searchPlaceholder: 'Buscar por descripción (ej.: uber)',
    filterCategoryLabel: 'CATEGORÍA',
    filterAccountLabel: 'CUENTA',
    filterAll: 'Todas',
    noResultsTitle: 'Nada encontrado',
    noResultsMessage: 'Ninguna transacción coincide con los filtros aplicados.',
    clearFilters: 'Limpiar filtros',
    resultsCount: (count: number) => `${count} ${count === 1 ? 'resultado' : 'resultados'}`,
    autoSuggestedBadge: 'Sugerida automáticamente',
    learnedBadge: 'Aprendida de ti',
  },
  accounts: {
    title: 'Cuentas Bancarias',
    consolidatedPrefix: 'Saldo consolidado:',
    currentBalance: 'Saldo actual',
    addBankAccount: 'Añadir cuenta bancaria',
    deleteTitle: (name: string) => `¿Eliminar ${name}?`,
    deleteMessage: 'La cuenta bancaria y todas sus transacciones vinculadas serán eliminadas.',
    deleteConfirmBtn: 'Eliminar cuenta',
    newAccountModalTitle: 'Nueva cuenta',
    createAccountSubmit: 'Crear cuenta',
    mostUsedBankLabel: 'Banco más usado',
    accountNameLabel: 'Nombre / apodo de la cuenta',
    accountNamePlaceholder: 'Ej.: Santander, Billetera…',
    initialBalanceLabel: 'Saldo inicial',
  },
  onboarding: {
    greeting: (name: string) => `¡Hola, ${name}!`,
    defaultUser: 'tú',
    subtitle:
      'Empecemos registrando tu primera cuenta bancaria. Puedes añadir más cuentas después.',
    startButton: 'Comenzar',
    signOut: 'Salir',
  },
  categories: {
    title: 'Categorías',
    subtitle: 'Crea categorías personalizadas para organizar tus gastos e ingresos.',
    customSection: 'PERSONALIZADAS',
    defaultSection: 'PREDETERMINADAS',
    newCategory: 'Nueva categoría',
    emptyCustom: 'Aún no has creado categorías personalizadas.',
    defaultLocked: 'Predeterminada',
    formNewTitle: 'Nueva categoría',
    formEditTitle: 'Editar categoría',
    nameLabel: 'Nombre de la categoría',
    namePlaceholder: 'Ej.: Mascotas, Gimnasio…',
    typeLabel: 'Tipo',
    iconLabel: 'Icono',
    colorLabel: 'Color',
    createSubmit: 'Crear categoría',
    removeTitle: (name: string) => `¿Eliminar ${name}?`,
    removeMessage:
      'Si esta categoría tiene transacciones, se archivará y se conservará el historial. Sin transacciones, se eliminará.',
    removeConfirm: 'Eliminar',
    edit: 'Editar',
  },
  auth: {
    loginSubtitle: 'Inicia sesión en tu cuenta para acceder a tus finanzas.',
    registerSubtitle: 'Crea tu cuenta personal para organizar tus bancos y gastos.',
    continueWithApple: 'Continuar con Apple',
    continueWithGoogle: 'Continuar con Google',
    orWithEmail: 'O CON TU CORREO',
    loginTab: 'Entrar',
    registerTab: 'Crear cuenta',
    yourNameLabel: 'Tu nombre',
    yourNamePlaceholder: 'Ej.: Eduardo Bialas',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@correo.com',
    passwordLabel: 'Contraseña',
    passwordRegisterPlaceholder: 'Mínimo 6 caracteres',
    passwordLoginPlaceholder: 'Tu contraseña',
    confirmPasswordLabel: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Repite la contraseña',
    submitLogin: 'Entrar a la billetera',
    submitRegister: 'Crear mi cuenta',
    noAccountPrompt: '¿Aún no tienes una cuenta? ',
    noAccountAction: 'Regístrate',
    hasAccountPrompt: '¿Ya tienes una cuenta? ',
    hasAccountAction: 'Iniciar sesión',
    appleSheetTitle: 'Iniciar sesión con Apple',
    googleSheetTitle: 'Iniciar sesión con Google',
    appleSheetSubtitle: 'Usa tu Apple ID para entrar en Smart Wallet',
    googleSheetSubtitle: 'Elige tu Cuenta de Google para continuar',
    accountNameField: 'Nombre de la cuenta',
    appleEmailField: 'Apple ID (Correo)',
    googleEmailField: 'Correo de Google',
  },
  settings: {
    title: 'Ajustes',
    subtitle: 'Administra tu cuenta, idioma, apariencia, privacidad y preferencias.',
    connectedProfile: 'PERFIL CONECTADO',
    changeNameLabel: 'Cambiar tu nombre',
    yourNamePlaceholder: 'Tu nombre',
    languageTitle: 'Idioma de la Aplicación',
    languageSubtitle: 'Elige el idioma de la interfaz',
    appearanceTitle: 'Apariencia y Tema',
    darkModeActive: 'Modo Nocturno activo',
    lightModeActive: 'Modo Claro activo',
    themeSystemDesc: 'Sigue al móvil',
    themeLightDesc: 'Lino y Papel',
    themeDarkDesc: 'Café y Cuero',
    hideBalancesTitle: 'Ocultar Saldos',
    hideBalancesDesc: (mask: string) => `Reemplaza valores por asteriscos (${mask})`,
    hiddenChip: 'Oculto',
    visibleChip: 'Visible',
    walletSummarySection: 'RESUMEN DE LA BILLETERA',
    bankAccountsCount: (count: number) =>
      `${count} ${count === 1 ? 'cuenta bancaria' : 'cuentas bancarias'}`,
    activeCategoriesCount: (count: number) => `${count} categorías activas`,
    activeCategoriesDesc: 'Categorías predeterminadas de ingresos y gastos',
    manageCategories: 'Administrar categorías',
    budgetTitle: 'Meta de gastos mensual',
    budgetDesc: 'Define un límite para seguir tu presupuesto en Inicio',
    budgetSave: 'Guardar meta',
    budgetRemove: 'Quitar meta',
    budgetCurrent: (value: string) => `Meta actual: ${value}`,
    budgetNone: 'Ninguna meta definida',
    sessionSection: 'SESIÓN Y SEGURIDAD DE LA CUENTA',
    signOutBtn: 'Cerrar sesión (Sign out)',
    deleteAccountBtn: 'Eliminar mi cuenta permanentemente',
    deleteAccountConfirmTitle: '¿Eliminar tu cuenta permanentemente?',
    deleteAccountConfirmMessage:
      'Todos tus datos, cuentas bancarias y transacciones se borrarán definitivamente de este dispositivo.',
    deleteAccountConfirmBtn: 'Eliminar todo',
  },
};

export const DICTIONARIES: Record<AppLanguage, Translations> = {
  pt,
  en,
  es,
};

interface I18nState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const useI18nStore = create<I18nState>()((set) => ({
  language: 'pt',
  setLanguage: (language) => set({ language }),
}));

export function useI18n() {
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  return {
    language,
    setLanguage,
    t: DICTIONARIES[language],
    tCategory: (id: string, fallbackName: string) => translateCategory(id, fallbackName, language),
  };
}

