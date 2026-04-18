import { redirect } from 'next/navigation';

/** Canonical marketing URL → onboarding (landing-quiz data merges on load). */
export default function SignupPage() {
  redirect('/onboarding');
}
