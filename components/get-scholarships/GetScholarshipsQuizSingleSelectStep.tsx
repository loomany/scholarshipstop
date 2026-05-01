'use client';

import { type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';

import { DarkSelect } from '@/components/home/DarkSelect';
import { ONBOARDING_PRIMARY_BUTTON_CLASS } from '@/lib/onboarding/onboardingPrimaryCta';

const hintClass = 'mt-1 text-sm text-zinc-600';
const sectionLabelClass =
  'mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-gray-700';

type Option = {
  value: string;
  label: string;
};

type Props = {
  disabled?: boolean;
  progressEyebrow: string;
  title: string;
  description: string;
  label: string;
  selectId: string;
  ariaLabel?: string;
  options: Option[];
  value: string;
  error?: string | null;
  menuClassName?: string;
  icon?: LucideIcon;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack?: () => void;
};

export function GetScholarshipsQuizSingleSelectStep({
  disabled = false,
  progressEyebrow,
  title,
  description,
  label,
  selectId,
  ariaLabel,
  options,
  value,
  error = null,
  menuClassName,
  icon: Icon,
  onChange,
  onContinue,
  onBack
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  return (
    <div className="w-full space-y-6">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={disabled}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50"
        >
          <ArrowLeft className="mr-2 inline h-4 w-4" aria-hidden />
          Back
        </button>
      ) : null}

      <div className="mx-auto max-w-lg text-center">
        {Icon ? (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E8] text-[#FF7A1A] ring-1 ring-[#FFD9B3]">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        ) : null}
        <p className={`${Icon ? 'mt-5' : ''} text-xs font-semibold uppercase tracking-[0.14em] text-[#A45A16]`}>
          {progressEyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#7A3B00] sm:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-medium leading-7 text-[#8C5A2B] sm:max-w-lg">
          {description}
        </p>
      </div>

      <form className="space-y-5 text-left" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor={selectId} className={sectionLabelClass}>
            {label}
          </label>
          <DarkSelect
            id={selectId}
            ariaLabel={ariaLabel ?? label}
            options={options}
            value={value}
            onChange={onChange}
            disabled={disabled}
            hasError={Boolean(error)}
            menuClassName={menuClassName}
          />
          {error ? <p className={hintClass}>{error}</p> : null}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={disabled}
            className={ONBOARDING_PRIMARY_BUTTON_CLASS}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
