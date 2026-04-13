import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Alias so dev tools can navigate to `/essay/:id` (canonical result lives under `/essays/u/:id`). */
export default async function EssayIdRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/essays/u/${id}`);
}
