import { redirect } from 'next/navigation';

import { readGrantDigestToken } from '@/lib/notifications/grantDigestToken';

type PageProps = {
  params: {
    token: string;
  };
};

export default function ScholarshipEmailDigestTokenPage({ params }: PageProps) {
  const token = params.token?.trim();
  if (!token) {
    redirect('/scholarships?tab=best-recommendation&scope=catalog&sort=best_recommendation');
  }
  const decoded = readGrantDigestToken(token);
  if (!decoded.ok || decoded.scholarshipIds.length === 0) {
    redirect('/scholarships?tab=best-recommendation&scope=catalog&sort=best_recommendation');
  }
  const emailIds = decoded.scholarshipIds.join(',');
  redirect(
    `/scholarships?tab=from-email&scope=catalog&sort=best_recommendation&email_ids=${encodeURIComponent(emailIds)}`
  );
}
