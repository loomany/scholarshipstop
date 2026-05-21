import type { Metadata } from 'next';
import Link from 'next/link';

import UnlockedIqReport from '@/components/iq/UnlockedIqReport';
import { getIqLocaleFromRequest } from '@/lib/iq/i18n/getIqLocaleFromRequest';
import { getIqReportMetadata } from '@/lib/iq/i18n/iqMetadataCopy';
import {
  getIqReportCopy,
  resolveIqReportLocale
} from '@/lib/iq/i18n/iqReportCopy';
import {
  getIqReportAdminClient,
  type IqReportOrderRow
} from '@/lib/iqReportOrders';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getIqLocaleFromRequest();
  const meta = getIqReportMetadata(locale);

  return {
    title: meta.title,
    description: meta.description,
    robots: {
      index: false,
      follow: false
    }
  };
}

export const dynamic = 'force-dynamic';

export default async function IqReportPage({
  params
}: {
  params: { token: string };
}) {
  const token = params.token?.trim();

  if (!token) return <ReportNotFound />;

  const { data } = await getIqReportAdminClient()
    .from('iq_report_orders')
    .select('*')
    .eq('access_token', token)
    .in('status', ['paid', 'email_sent'])
    .maybeSingle();

  if (!data) return <ReportNotFound />;

  const report = data as IqReportOrderRow;
  const locale = resolveIqReportLocale(report.assessment_result);

  return (
    <UnlockedIqReport
      result={report.assessment_result}
      email={report.email}
      locale={locale}
    />
  );
}

function ReportNotFound() {
  const locale = getIqLocaleFromRequest();
  const copy = getIqReportCopy(locale).notFound;

  return (
    <main className="iq-product-shell grid min-h-screen place-items-center bg-[#f8fafc] px-6 text-slate-950">
      <section className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{copy.body}</p>
        <Link
          href={locale === 'en' ? '/' : `/${locale}`}
          className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          {copy.backCta}
        </Link>
      </section>
    </main>
  );
}
