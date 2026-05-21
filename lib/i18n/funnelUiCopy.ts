import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type GetScholarshipsQuizUiCopy = {
  loadingProgress: string;
  backToIntro: string;
  countryStepProgress: string;
  countryStepTitle: string;
  countryStepDescription: string;
  countryFieldLabel: string;
  countryPlaceholder: string;
  countryNoMatches: string;
  countryOptional: string;
  citizenshipNotSpecified: string;
  yourCountryFallback: string;
  continueButton: string;
  backButton: string;
  emailStepProgress: string;
  emailStepTitle: string;
  emailStepDescriptionTemplate: string;
  emailFieldLabel: string;
  emailPlaceholder: string;
  submitMatches: string;
  preparingMatches: string;
  signInWithGoogle: string;
  openingGoogle: string;
  noPasswordHint: string;
  errorPickCountry: string;
  errorChooseCountry: string;
  errorInvalidEmail: string;
  errorCouldNotPrepareFilters: string;
  errorCouldNotSaveFilters: string;
  errorGoogleSignInFailed: string;
};

const EN: GetScholarshipsQuizUiCopy = {
  loadingProgress: 'Loading your progress…',
  backToIntro: '← Back to intro',
  countryStepProgress: 'Step 1 of 2 · Applicant country',
  countryStepTitle: 'Which country are you applying from?',
  countryStepDescription:
    'Choose your citizenship or home country first so we can show scholarships you are more likely eligible for.',
  countryFieldLabel: 'Applicant country / citizenship',
  countryPlaceholder: 'Select or type your country',
  countryNoMatches: 'No matches found.',
  countryOptional: 'Optional',
  citizenshipNotSpecified: 'Citizenship not specified',
  yourCountryFallback: 'your country',
  continueButton: 'Continue',
  backButton: 'Back',
  emailStepProgress: 'Step 2 of 2 · Account',
  emailStepTitle: 'Where should we send your scholarship matches?',
  emailStepDescriptionTemplate:
    'No spam. We will send one daily scholarship digest for {country}, plus a confirmation link so your matches stay saved.',
  emailFieldLabel: 'Email address',
  emailPlaceholder: 'Email address',
  submitMatches: 'See scholarship matches',
  preparingMatches: 'Preparing your matches…',
  signInWithGoogle: 'Sign in with Google',
  openingGoogle: 'Opening Google…',
  noPasswordHint:
    'You can unsubscribe anytime. No password needed now; if you want one later, use forgot password.',
  errorPickCountry: 'Choose your country to continue.',
  errorChooseCountry: 'Choose your country first.',
  errorInvalidEmail: 'Enter a valid email address.',
  errorCouldNotPrepareFilters: 'Could not prepare your scholarship filters.',
  errorCouldNotSaveFilters:
    'Could not save your filters. Check browser storage settings and try again.',
  errorGoogleSignInFailed: 'Google sign-in failed.'
};

const ES: GetScholarshipsQuizUiCopy = {
  loadingProgress: 'Cargando tu progreso…',
  backToIntro: '← Volver al inicio',
  countryStepProgress: 'Paso 1 de 2 · País del solicitante',
  countryStepTitle: '¿Desde qué país solicitas?',
  countryStepDescription:
    'Selecciona tu ciudadanía o país de origen para que mostremos becas en las que tienes más probabilidades de ser elegible.',
  countryFieldLabel: 'País del solicitante / ciudadanía',
  countryPlaceholder: 'Selecciona o escribe tu país',
  countryNoMatches: 'Sin coincidencias.',
  countryOptional: 'Opcional',
  citizenshipNotSpecified: 'Ciudadanía sin especificar',
  yourCountryFallback: 'tu país',
  continueButton: 'Continuar',
  backButton: 'Atrás',
  emailStepProgress: 'Paso 2 de 2 · Cuenta',
  emailStepTitle: '¿A dónde te enviamos tus becas recomendadas?',
  emailStepDescriptionTemplate:
    'Sin spam. Enviaremos un resumen diario de becas para {country}, además de un enlace de confirmación para guardar tus coincidencias.',
  emailFieldLabel: 'Correo electrónico',
  emailPlaceholder: 'Correo electrónico',
  submitMatches: 'Ver mis becas',
  preparingMatches: 'Preparando tus becas…',
  signInWithGoogle: 'Iniciar sesión con Google',
  openingGoogle: 'Abriendo Google…',
  noPasswordHint:
    'Puedes darte de baja cuando quieras. No necesitas contraseña ahora; si la quieres luego, usa "Olvidé mi contraseña".',
  errorPickCountry: 'Selecciona tu país para continuar.',
  errorChooseCountry: 'Selecciona tu país primero.',
  errorInvalidEmail: 'Introduce un correo válido.',
  errorCouldNotPrepareFilters: 'No pudimos preparar tus filtros de becas.',
  errorCouldNotSaveFilters:
    'No pudimos guardar tus filtros. Revisa los permisos del navegador e inténtalo de nuevo.',
  errorGoogleSignInFailed: 'Falló el inicio de sesión con Google.'
};

const FR: GetScholarshipsQuizUiCopy = {
  loadingProgress: 'Chargement de votre progression…',
  backToIntro: '← Retour à l’intro',
  countryStepProgress: 'Étape 1 sur 2 · Pays du candidat',
  countryStepTitle: 'Depuis quel pays postulez-vous ?',
  countryStepDescription:
    'Choisissez votre nationalité ou pays d’origine pour voir les bourses pour lesquelles vous êtes le plus susceptible d’être éligible.',
  countryFieldLabel: 'Pays du candidat / nationalité',
  countryPlaceholder: 'Sélectionnez ou tapez votre pays',
  countryNoMatches: 'Aucun résultat.',
  countryOptional: 'Optionnel',
  citizenshipNotSpecified: 'Nationalité non précisée',
  yourCountryFallback: 'votre pays',
  continueButton: 'Continuer',
  backButton: 'Retour',
  emailStepProgress: 'Étape 2 sur 2 · Compte',
  emailStepTitle: 'Où envoyons-nous vos bourses recommandées ?',
  emailStepDescriptionTemplate:
    'Pas de spam. Nous enverrons une sélection quotidienne de bourses pour {country}, plus un lien de confirmation pour conserver vos correspondances.',
  emailFieldLabel: 'Adresse e-mail',
  emailPlaceholder: 'Adresse e-mail',
  submitMatches: 'Voir mes bourses',
  preparingMatches: 'Préparation de vos bourses…',
  signInWithGoogle: 'Se connecter avec Google',
  openingGoogle: 'Ouverture de Google…',
  noPasswordHint:
    'Vous pouvez vous désinscrire à tout moment. Aucun mot de passe nécessaire maintenant ; pour en créer un plus tard, utilisez « Mot de passe oublié ».',
  errorPickCountry: 'Choisissez votre pays pour continuer.',
  errorChooseCountry: 'Choisissez d’abord votre pays.',
  errorInvalidEmail: 'Saisissez une adresse e-mail valide.',
  errorCouldNotPrepareFilters: 'Impossible de préparer vos filtres de bourses.',
  errorCouldNotSaveFilters:
    'Impossible d’enregistrer vos filtres. Vérifiez les paramètres de stockage du navigateur et réessayez.',
  errorGoogleSignInFailed: 'Échec de la connexion Google.'
};

export function getGetScholarshipsQuizUiCopy(
  locale: LocalizedUiLocale
): GetScholarshipsQuizUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
