import { RESOURCES_PAGE_TITLE } from '@/lib/content-hub/resourcesSection';

export default function ContentHubHero() {
  return (
    <header className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
        {RESOURCES_PAGE_TITLE}
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-gray-600 sm:mt-4 sm:text-xl sm:leading-relaxed">
        Helpful guides, scholarship tips, and practical advice to help students
        find and apply for scholarships more effectively.
      </p>
    </header>
  );
}
