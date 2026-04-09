import type { Metadata } from 'next';
import SubscriptionPricingClient from '@/components/subscription/SubscriptionPricingClient';
import SiteFooter from '@/components/ui/Footer/SiteFooter';

export const metadata: Metadata = {
  title: 'Unlock Premium Precision'
};

export default function SubscriptionPage() {
  return (
    <>
      <section className="bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Unlock Premium Precision
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-gray-500 sm:text-lg">
              Start your 3-day free trial today. Cancel anytime.
            </p>
          </header>

          <SubscriptionPricingClient />

          <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
            Payments are securely processed by LemonSqueezy, our Merchant of Record.
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
