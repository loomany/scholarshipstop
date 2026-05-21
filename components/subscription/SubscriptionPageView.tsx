import SubscriptionPricingClient from '@/components/subscription/SubscriptionPricingClient';
import type { SubscriptionPageViewProps } from '@/lib/server/subscriptionPageProps';

export default function SubscriptionPageView(props: SubscriptionPageViewProps) {
  const { copy } = props;

  return (
    <section className="subscription-compact-page bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {copy.pageTitle}
          </h1>
        </header>

        <SubscriptionPricingClient
          copy={copy}
          returnPath={props.returnPath}
          isAuthenticated={props.isAuthenticated}
          currentPlanKey={props.currentPlanKey}
          currentPlanStatusLabel={props.currentPlanStatusLabel}
          hasActiveSubscription={props.hasActiveSubscription}
          manageSubscriptionUrl={props.manageSubscriptionUrl}
          updatePaymentUrl={props.updatePaymentUrl}
          showResumeAction={props.showResumeAction}
          showUpdatePaymentAction={props.showUpdatePaymentAction}
          pastDueBillingAccent={props.pastDueBillingAccent}
          isEligibleForSkipTrial={props.isEligibleForSkipTrial}
        />

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray-500">
          {copy.paymentDisclaimer}
        </p>
      </div>
    </section>
  );
}
