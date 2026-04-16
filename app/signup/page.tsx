import { redirect } from 'next/navigation';

/** Canonical marketing URL → same onboarding entry as “Create free account” elsewhere. */
export default function SignupPage() {
  redirect('/onboarding?step=3');
}
