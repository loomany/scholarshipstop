import type { LocalizedUiLocale } from '@/lib/i18n/localizedHref';

export type AuthUiCopy = {
  signInCardTitle: string;
  signUpCardTitle: string;
  forgotPasswordCardTitle: string;
  updatePasswordCardTitle: string;
  signInDescription: string;
  forgotPasswordDescription: string;
  updatePasswordDescription: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholderSignIn: string;
  passwordPlaceholderSignUp: string;
  signInButton: string;
  signInButtonLoading: string;
  signUpButton: string;
  signUpButtonLoading: string;
  signInWithGoogle: string;
  signInWithEmailLink: string;
  signInWithEmailPassword: string;
  forgotPassword: string;
  backToSignIn: string;
  sendResetLink: string;
  sendResetLinkLoading: string;
  noAccountQuestion: string;
  createOneAction: string;
  haveAccountQuestion: string;
  signUpAction: string;
  thirdPartySeparator: string;
  invalidEmail: string;
  signInFailed: string;
  somethingWentWrong: string;
  /** Inline form error strings used by `SCHOLARSHIPS_HUB_BEST_RECOMMENDATION_HREF` redirect flow. */
  redirectAfterAuthFailed: string;
  resetPasswordSigningIn: string;
  resetPasswordCompleting: string;
  resetLinkExpiredDescription: string;
  resetLoginFailedDescription: string;
  resetCouldNotUseLink: string;
  resetRequestNewEmail: string;
  resetLinkIncomplete: string;
  resetOpenLatestEmail: string;
  resetNowSignedIn: string;
  resetEnterNewPassword: string;
};

const EN: AuthUiCopy = {
  signInCardTitle: 'Sign in',
  signUpCardTitle: 'Sign Up',
  forgotPasswordCardTitle: 'Reset Password',
  updatePasswordCardTitle: 'Set New Password',
  signInDescription:
    'View your scholarship matches, saved opportunities, and application progress.',
  forgotPasswordDescription:
    "Enter your email and we'll send you a password reset link.",
  updatePasswordDescription:
    'Create a new password for your ScholarshipTop account.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholderSignIn: 'Enter your password',
  passwordPlaceholderSignUp: 'Password',
  signInButton: 'Sign in',
  signInButtonLoading: 'Signing in…',
  signUpButton: 'Sign up',
  signUpButtonLoading: 'Creating account…',
  signInWithGoogle: 'Sign in with Google',
  signInWithEmailLink: 'Sign in via magic link',
  signInWithEmailPassword: 'Sign in with email and password',
  forgotPassword: 'Forgot your password?',
  backToSignIn: 'Back to sign in',
  sendResetLink: 'Send reset link',
  sendResetLinkLoading: 'Sending…',
  noAccountQuestion: "Don't have an account?",
  createOneAction: 'Create one',
  haveAccountQuestion: 'Already have an account?',
  signUpAction: 'Sign up',
  thirdPartySeparator: 'Third-party sign-in',
  invalidEmail: 'Invalid email address.',
  signInFailed: 'Sign in failed.',
  somethingWentWrong: 'Hmm… Something went wrong.',
  redirectAfterAuthFailed: 'You could not be signed in.',
  resetPasswordSigningIn: 'Signing you in…',
  resetPasswordCompleting: 'Completing sign-in…',
  resetLinkExpiredDescription: 'Link may be expired. Request a new reset email.',
  resetLoginFailedDescription:
    "Sorry, we weren't able to log you in. Please try again.",
  resetCouldNotUseLink: 'Could not use reset link',
  resetRequestNewEmail: 'Request a new password reset email and try again.',
  resetLinkIncomplete: 'Reset link incomplete',
  resetOpenLatestEmail:
    'Open the link from your latest email, or request a new password reset.',
  resetNowSignedIn: 'You are now signed in.',
  resetEnterNewPassword: 'Please enter a new password for your account.'
};

const ES: AuthUiCopy = {
  signInCardTitle: 'Iniciar sesión',
  signUpCardTitle: 'Crear cuenta',
  forgotPasswordCardTitle: 'Recuperar contraseña',
  updatePasswordCardTitle: 'Establecer nueva contraseña',
  signInDescription:
    'Consulta tus becas recomendadas, oportunidades guardadas y el progreso de tus solicitudes.',
  forgotPasswordDescription:
    'Introduce tu correo y te enviaremos un enlace para restablecer la contraseña.',
  updatePasswordDescription:
    'Crea una nueva contraseña para tu cuenta de ScholarshipTop.',
  emailLabel: 'Correo electrónico',
  emailPlaceholder: 'tu@ejemplo.com',
  passwordLabel: 'Contraseña',
  passwordPlaceholderSignIn: 'Introduce tu contraseña',
  passwordPlaceholderSignUp: 'Contraseña',
  signInButton: 'Iniciar sesión',
  signInButtonLoading: 'Iniciando sesión…',
  signUpButton: 'Crear cuenta',
  signUpButtonLoading: 'Creando cuenta…',
  signInWithGoogle: 'Iniciar sesión con Google',
  signInWithEmailLink: 'Entrar con enlace mágico',
  signInWithEmailPassword: 'Entrar con correo y contraseña',
  forgotPassword: '¿Olvidaste tu contraseña?',
  backToSignIn: 'Volver al inicio de sesión',
  sendResetLink: 'Enviar enlace de recuperación',
  sendResetLinkLoading: 'Enviando…',
  noAccountQuestion: '¿No tienes cuenta?',
  createOneAction: 'Crear una',
  haveAccountQuestion: '¿Ya tienes cuenta?',
  signUpAction: 'Crear cuenta',
  thirdPartySeparator: 'Acceso con terceros',
  invalidEmail: 'Correo electrónico no válido.',
  signInFailed: 'No se pudo iniciar sesión.',
  somethingWentWrong: 'Algo salió mal.',
  redirectAfterAuthFailed: 'No pudimos iniciar tu sesión.',
  resetPasswordSigningIn: 'Iniciando sesión…',
  resetPasswordCompleting: 'Completando el acceso…',
  resetLinkExpiredDescription:
    'El enlace puede haber caducado. Solicita un nuevo correo de recuperación.',
  resetLoginFailedDescription:
    'No pudimos iniciar tu sesión. Inténtalo de nuevo.',
  resetCouldNotUseLink: 'No se pudo usar el enlace',
  resetRequestNewEmail:
    'Solicita un nuevo correo de recuperación e inténtalo otra vez.',
  resetLinkIncomplete: 'Enlace de recuperación incompleto',
  resetOpenLatestEmail:
    'Abre el enlace del correo más reciente o solicita uno nuevo.',
  resetNowSignedIn: 'Ya has iniciado sesión.',
  resetEnterNewPassword: 'Introduce una nueva contraseña para tu cuenta.'
};

const FR: AuthUiCopy = {
  signInCardTitle: 'Connexion',
  signUpCardTitle: 'Créer un compte',
  forgotPasswordCardTitle: 'Réinitialiser le mot de passe',
  updatePasswordCardTitle: 'Définir un nouveau mot de passe',
  signInDescription:
    'Retrouvez vos bourses recommandées, opportunités enregistrées et l’avancement de vos candidatures.',
  forgotPasswordDescription:
    'Saisissez votre e-mail et nous vous enverrons un lien de réinitialisation.',
  updatePasswordDescription:
    'Créez un nouveau mot de passe pour votre compte ScholarshipTop.',
  emailLabel: 'E-mail',
  emailPlaceholder: 'vous@exemple.com',
  passwordLabel: 'Mot de passe',
  passwordPlaceholderSignIn: 'Entrez votre mot de passe',
  passwordPlaceholderSignUp: 'Mot de passe',
  signInButton: 'Se connecter',
  signInButtonLoading: 'Connexion…',
  signUpButton: 'Créer un compte',
  signUpButtonLoading: 'Création du compte…',
  signInWithGoogle: 'Se connecter avec Google',
  signInWithEmailLink: 'Se connecter via lien magique',
  signInWithEmailPassword: 'Se connecter avec e-mail et mot de passe',
  forgotPassword: 'Mot de passe oublié ?',
  backToSignIn: 'Retour à la connexion',
  sendResetLink: 'Envoyer le lien',
  sendResetLinkLoading: 'Envoi…',
  noAccountQuestion: 'Pas encore de compte ?',
  createOneAction: 'Créer un compte',
  haveAccountQuestion: 'Vous avez déjà un compte ?',
  signUpAction: 'Créer un compte',
  thirdPartySeparator: 'Connexion tierce',
  invalidEmail: 'Adresse e-mail invalide.',
  signInFailed: 'Impossible de se connecter.',
  somethingWentWrong: 'Une erreur est survenue.',
  redirectAfterAuthFailed: 'Nous n’avons pas pu vous connecter.',
  resetPasswordSigningIn: 'Connexion en cours…',
  resetPasswordCompleting: 'Finalisation de la connexion…',
  resetLinkExpiredDescription:
    'Le lien a peut-être expiré. Demandez un nouvel e-mail de réinitialisation.',
  resetLoginFailedDescription:
    'Nous n’avons pas pu vous connecter. Veuillez réessayer.',
  resetCouldNotUseLink: 'Impossible d’utiliser le lien',
  resetRequestNewEmail:
    'Demandez un nouvel e-mail de réinitialisation et réessayez.',
  resetLinkIncomplete: 'Lien de réinitialisation incomplet',
  resetOpenLatestEmail:
    'Ouvrez le lien du dernier e-mail ou demandez-en un nouveau.',
  resetNowSignedIn: 'Vous êtes connecté.',
  resetEnterNewPassword: 'Saisissez un nouveau mot de passe pour votre compte.'
};

export function getAuthUiCopy(locale: LocalizedUiLocale): AuthUiCopy {
  if (locale === 'es') return ES;
  if (locale === 'fr') return FR;
  return EN;
}
