import type { Metadata } from 'next';
import Link from 'next/link';

import UnlockedIqReport from '@/components/iq/UnlockedIqReport';
import {
  getIqReportAdminClient,
  type IqReportOrderRow
} from '@/lib/iqReportOrders';

export const metadata: Metadata = {
  title: 'Your IQ Report',
  description: 'Unlocked IQ-style cognitive report.',
  robots: {
    index: false,
    follow: false
  }
};

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
  return <UnlockedIqReport result={report.assessment_result} />;
}

function ReportNotFound() {
  return (
    <main className="iq-product-shell grid min-h-screen place-items-center bg-[#f8fafc] px-6 text-slate-950">
      <section className="max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Report not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This report link may be incomplete, unpaid, or no longer available.
          Contact support if payment was completed.
        </p>
        <Link
          href="/iq"
          className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Back to IQ Profile
        </Link>
      </section>
    </main>
  );
}
