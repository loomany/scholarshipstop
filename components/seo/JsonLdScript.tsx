import {
  pruneJsonLd,
  serializeJsonLd,
  type JsonLdBreadcrumbItem
} from '@/lib/seo/jsonLd';

type JsonLdScriptProps = {
  data:
    | Record<string, unknown>
    | Array<Record<string, unknown> | null | undefined>
    | null
    | undefined;
};

export function JsonLdScript({ data }: JsonLdScriptProps) {
  if (!data) return null;

  const blocks = (Array.isArray(data) ? data : [data]).filter(
    (block): block is Record<string, unknown> =>
      block != null && typeof block === 'object'
  );

  return (
    <>
      {blocks.map((block, index) => {
        const pruned = pruneJsonLd(block);
        if (!pruned['@type'] && !pruned['@graph']) return null;

        return (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(pruned) }}
          />
        );
      })}
    </>
  );
}

/** Convenience export for pages building breadcrumb JSON-LD alongside other blocks. */
export type { JsonLdBreadcrumbItem };
