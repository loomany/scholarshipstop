import 'server-only';

import { isPlausibleHouseholdIncome } from './stateAffordability';
import type { SchoolEnrichment, StateAffordability } from './types';

export type VizBarMetric = {
  key: string;
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  leftCaption?: string;
  rightCaption?: string;
  hint?: string;
};

export type VizPairMetric = {
  key: string;
  label: string;
  leftValue: number | null;
  rightValue: number | null;
  leftLabel: string;
  rightLabel: string;
  hint?: string;
};

function finite(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function incomeValue(row: StateAffordability | null): number | null {
  const income = row?.median_household_income;
  if (!isPlausibleHouseholdIncome(income)) return null;
  return finite(income);
}

export function stateCompareBarMetrics(
  rowA: StateAffordability | null,
  rowB: StateAffordability | null
): VizBarMetric[] {
  const metrics: VizBarMetric[] = [
    {
      key: 'income',
      label: 'Median household income',
      leftValue: incomeValue(rowA),
      rightValue: incomeValue(rowB),
      hint: 'Annual, Census ACS'
    },
    {
      key: 'fmr2',
      label: 'HUD fair market rent (2BR)',
      leftValue: finite(rowA?.hud_fmr_2br),
      rightValue: finite(rowB?.hud_fmr_2br),
      hint: 'Monthly HUD estimate'
    },
    {
      key: 'living_wage',
      label: 'Living wage (single adult)',
      leftValue: finite(rowA?.living_wage_single_adult),
      rightValue: finite(rowB?.living_wage_single_adult),
      hint: 'Hourly, MIT model'
    },
    {
      key: 'bls',
      label: 'BLS median wage',
      leftValue: finite(rowA?.bls_median_wage),
      rightValue: finite(rowB?.bls_median_wage),
      hint: 'Annual state estimate'
    }
  ];

  return metrics.filter((m) => m.leftValue != null || m.rightValue != null);
}

export function statePlanningPairMetrics(
  row: StateAffordability | null
): VizPairMetric[] {
  if (!row) return [];

  const income = incomeValue(row);
  const fmr = finite(row.hud_fmr_2br);
  const livingWage = finite(row.living_wage_single_adult);
  const bls = finite(row.bls_median_wage);

  const pairs: VizPairMetric[] = [];

  if (income != null && fmr != null) {
    pairs.push({
      key: 'income_rent',
      label: 'Monthly income vs rent',
      leftValue: income / 12,
      rightValue: fmr,
      leftLabel: 'Income (est. monthly)',
      rightLabel: 'HUD FMR 2BR',
      hint: 'Income is household median divided by 12'
    });
  }

  if (livingWage != null && bls != null) {
    pairs.push({
      key: 'wage_compare',
      label: 'Living wage vs BLS median',
      leftValue: livingWage * 2080,
      rightValue: bls,
      leftLabel: 'Living wage (annual est.)',
      rightLabel: 'BLS median wage',
      hint: 'Living wage hourly × 2,080 hours'
    });
  }

  return pairs;
}

export function schoolCompareBarMetrics(
  rowA: SchoolEnrichment | null,
  rowB: SchoolEnrichment | null
): VizBarMetric[] {
  const metrics: VizBarMetric[] = [
    {
      key: 'tuition_in',
      label: 'In-state tuition',
      leftValue: finite(rowA?.tuition_in_state),
      rightValue: finite(rowB?.tuition_in_state),
      hint: 'Annual, before aid'
    },
    {
      key: 'tuition_out',
      label: 'Out-of-state tuition',
      leftValue: finite(rowA?.tuition_out_of_state),
      rightValue: finite(rowB?.tuition_out_of_state),
      hint: 'Annual, before aid'
    },
    {
      key: 'net_price',
      label: 'Average net price',
      leftValue: finite(rowA?.avg_net_price),
      rightValue: finite(rowB?.avg_net_price),
      hint: 'After aid estimate'
    },
    {
      key: 'earnings',
      label: 'Median earnings',
      leftValue: finite(rowA?.median_earnings),
      rightValue: finite(rowB?.median_earnings),
      hint: '10 years after entry'
    },
    {
      key: 'completion',
      label: 'Completion rate',
      leftValue: finite(rowA?.completion_rate),
      rightValue: finite(rowB?.completion_rate),
      hint: 'Share completing within time'
    },
    {
      key: 'admission',
      label: 'Admission rate',
      leftValue: finite(rowA?.admission_rate),
      rightValue: finite(rowB?.admission_rate),
      hint: 'Share admitted'
    }
  ];

  return metrics.filter((m) => m.leftValue != null || m.rightValue != null);
}

export function schoolProfilePairMetrics(
  row: SchoolEnrichment | null
): VizPairMetric[] {
  if (!row) return [];

  const inState = finite(row.tuition_in_state);
  const outState = finite(row.tuition_out_of_state);
  const net = finite(row.avg_net_price);
  const pairs: VizPairMetric[] = [];

  if (inState != null && outState != null) {
    pairs.push({
      key: 'tuition',
      label: 'In-state vs out-of-state tuition',
      leftValue: inState,
      rightValue: outState,
      leftLabel: 'In-state',
      rightLabel: 'Out-of-state'
    });
  }

  if (net != null && inState != null) {
    pairs.push({
      key: 'net_vs_tuition',
      label: 'Net price vs in-state tuition',
      leftValue: net,
      rightValue: inState,
      leftLabel: 'Avg net price',
      rightLabel: 'In-state tuition'
    });
  }

  return pairs;
}

export function schoolSingleBarMetrics(
  row: SchoolEnrichment | null
): VizBarMetric[] {
  if (!row) return [];

  const metrics = [
    { key: 'tuition_in', label: 'In-state tuition', value: finite(row.tuition_in_state) },
    { key: 'net_price', label: 'Average net price', value: finite(row.avg_net_price) },
    { key: 'earnings', label: 'Median earnings', value: finite(row.median_earnings) },
    { key: 'completion', label: 'Completion rate', value: finite(row.completion_rate) },
    { key: 'admission', label: 'Admission rate', value: finite(row.admission_rate) },
    { key: 'size', label: 'Enrollment', value: finite(row.student_size) }
  ].filter((m) => m.value != null);

  if (!metrics.length) return [];

  const max = Math.max(...metrics.map((m) => m.value!));

  return metrics.map((m) => ({
    key: m.key,
    label: m.label,
    leftValue: m.value,
    rightValue: max,
    leftCaption: 'Value',
    rightCaption: 'Relative scale',
    hint: m.key.includes('rate') ? 'Share (0–1 scale shown comparatively)' : undefined
  }));
}
