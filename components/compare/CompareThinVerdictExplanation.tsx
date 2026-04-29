type Props = {
  paragraphs: readonly [string, string];
};

/**
 * Long-form explanatory copy surfaced only when compare detail pages ship with thin narratives.
 */
export default function CompareThinVerdictExplanation({ paragraphs }: Props) {
  return (
    <section
      className="mt-10 rounded-2xl border border-amber-100 bg-amber-50/40 p-6 shadow-sm sm:p-8"
      aria-labelledby="compare-verdict-explanation-heading"
    >
      <h2
        id="compare-verdict-explanation-heading"
        className="scroll-mt-28 text-xl font-bold tracking-tight text-gray-900 sm:scroll-mt-24"
      >
        Final verdict explanation
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-700 sm:text-base">
        <p>{paragraphs[0]}</p>
        <p>{paragraphs[1]}</p>
      </div>
    </section>
  );
}
