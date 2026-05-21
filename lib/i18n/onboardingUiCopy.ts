import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type OnboardingUiCopy = {
  loadingProgress: string;
  backToHome: string;
  backToIntro: string;
  step1Eyebrow: string;
  step1Title: string;
  step1Description: string;
  step2Eyebrow: string;
  countryError: string;
  step2Back: string;
  step2Title: string;
  step2Intro1: string;
  step2Intro2: string;
  birthday: string;
  birthMonthAria: string;
  birthDayAria: string;
  birthYearAria: string;
  dayPlaceholder: string;
  yearPlaceholder: string;
  firstNamePlaceholder: string;
  lastNamePlaceholder: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  continueGoogle: string;
  createAccountCta: string;
  creatingAccount: string;
};

const EN: OnboardingUiCopy = {
  loadingProgress: 'Loading your progress…',
  backToHome: '← Back to home',
  backToIntro: '← Back to intro',
  step1Eyebrow: 'Step 1 · Country',
  step1Title: 'Where are you applying from?',
  step1Description:
    "Choose your applicant country first. We'll adapt the signup questions and scholarship matching to that country.",
  step2Eyebrow: 'Step 2 of 2 · Account',
  countryError: 'Choose your country to continue.',
  step2Back: 'Back',
  step2Title: 'Create your account',
  step2Intro1: 'Your email is used to save your matches and personalize results.',
  step2Intro2: 'We never sell your data.',
  birthday: 'Birthday',
  birthMonthAria: 'Birth month',
  birthDayAria: 'Birth day',
  birthYearAria: 'Birth year',
  dayPlaceholder: 'Day',
  yearPlaceholder: 'Year',
  firstNamePlaceholder: 'First name',
  lastNamePlaceholder: 'Last name',
  emailPlaceholder: 'Email address',
  passwordPlaceholder: 'Create password',
  confirmPasswordPlaceholder: 'Confirm password',
  continueGoogle: 'Continue with Google',
  createAccountCta: 'Create account & find scholarships',
  creatingAccount: 'Creating your account…'
};

const ES: OnboardingUiCopy = {
  ...EN,
  loadingProgress: 'Cargando tu progreso…',
  backToHome: '← Volver al inicio',
  backToIntro: '← Volver al inicio',
  step1Eyebrow: 'Paso 1 · País',
  step1Title: '¿Desde qué país solicitas?',
  step1Description:
    'Elige primero tu país de solicitante. Adaptaremos el registro y las becas recomendadas a ese país.',
  step2Eyebrow: 'Paso 2 de 2 · Cuenta',
  countryError: 'Elige tu país para continuar.',
  step2Back: 'Atrás',
  step2Title: 'Crea tu cuenta',
  step2Intro1: 'Tu correo guarda tus coincidencias y personaliza los resultados.',
  step2Intro2: 'Nunca vendemos tus datos.',
  birthday: 'Fecha de nacimiento',
  birthMonthAria: 'Mes de nacimiento',
  birthDayAria: 'Día de nacimiento',
  birthYearAria: 'Año de nacimiento',
  firstNamePlaceholder: 'Nombre',
  lastNamePlaceholder: 'Apellido',
  emailPlaceholder: 'Correo electrónico',
  passwordPlaceholder: 'Crear contraseña',
  confirmPasswordPlaceholder: 'Confirmar contraseña',
  continueGoogle: 'Continuar con Google',
  createAccountCta: 'Crear cuenta y ver becas',
  creatingAccount: 'Creando tu cuenta…'
};

const FR: OnboardingUiCopy = {
  ...EN,
  loadingProgress: 'Chargement de votre progression…',
  backToHome: '← Retour à l’accueil',
  backToIntro: '← Retour à l’intro',
  step1Eyebrow: 'Étape 1 · Pays',
  step1Title: 'Depuis quel pays candidatez-vous ?',
  step1Description:
    'Choisissez d’abord votre pays de candidature. Nous adapterons l’inscription et les bourses à ce pays.',
  step2Eyebrow: 'Étape 2 sur 2 · Compte',
  countryError: 'Choisissez votre pays pour continuer.',
  step2Back: 'Retour',
  step2Title: 'Créez votre compte',
  step2Intro1: 'Votre e-mail enregistre vos correspondances et personnalise les résultats.',
  step2Intro2: 'Nous ne vendons jamais vos données.',
  birthday: 'Date de naissance',
  birthMonthAria: 'Mois de naissance',
  birthDayAria: 'Jour de naissance',
  birthYearAria: 'Année de naissance',
  firstNamePlaceholder: 'Prénom',
  lastNamePlaceholder: 'Nom',
  emailPlaceholder: 'Adresse e-mail',
  passwordPlaceholder: 'Créer un mot de passe',
  confirmPasswordPlaceholder: 'Confirmer le mot de passe',
  continueGoogle: 'Continuer avec Google',
  createAccountCta: 'Créer un compte et voir les bourses',
  creatingAccount: 'Création du compte…'
};

export function getOnboardingUiCopy(locale: LocalizedUiLocale): OnboardingUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
