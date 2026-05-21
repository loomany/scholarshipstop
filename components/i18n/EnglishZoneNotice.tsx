import type { Stage2PilotLocale } from '@/lib/i18n/pilotRoutes';

const COPY: Record<
  Stage2PilotLocale,
  { title: string; body: string }
> = {
  es: {
    title: 'Contenido en inglés',
    body:
      'Las comparaciones publicadas entre universidades o estados aún no tienen traducción completa. Los títulos y el texto detallado siguen en inglés hasta que se publiquen versiones localizadas.'
  },
  fr: {
    title: 'Contenu en anglais',
    body:
      'Les comparaisons publiées entre universités ou États ne sont pas encore entièrement traduites. Les titres et le texte détaillé restent en anglais jusqu’à publication des versions localisées.'
  }
};

export function EnglishZoneNotice({ locale }: { locale: Stage2PilotLocale }) {
  const copy = COPY[locale];
  return (
    <div
      className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 sm:px-5"
      role="note"
    >
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1 text-amber-900">{copy.body}</p>
    </div>
  );
}
