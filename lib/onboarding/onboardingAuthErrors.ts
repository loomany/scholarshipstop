/** Supabase / GoTrue messages when email is already in use. */
export function isEmailAlreadyRegisteredMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already registered') ||
    (m.includes('email') && m.includes('already') && m.includes('register')) ||
    m.includes('duplicate key') ||
    m.includes('already exists')
  );
}
