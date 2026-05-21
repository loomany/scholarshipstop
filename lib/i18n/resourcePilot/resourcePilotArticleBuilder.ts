export type ResourcePilotFaqDef = { question: string; answer: string };

export type ResourcePilotSectionDef = {
  h2: string;
  paragraphs: string[];
  bullets?: string[];
};

export type ResourcePilotLocaleArticleDef = {
  translated_title: string;
  translated_meta_title: string;
  translated_meta_description: string;
  translated_summary: string;
  sections: ResourcePilotSectionDef[];
  translated_faq_json: ResourcePilotFaqDef[];
};

export function sectionsToHtml(sections: ResourcePilotSectionDef[]): string {
  const parts: string[] = [];
  for (const s of sections) {
    parts.push(`<h2>${escapeHtml(s.h2)}</h2>`);
    for (const p of s.paragraphs) {
      parts.push(`<p>${escapeHtml(p)}</p>`);
    }
    if (s.bullets?.length) {
      parts.push('<ul>');
      for (const b of s.bullets) {
        parts.push(`<li>${escapeHtml(b)}</li>`);
      }
      parts.push('</ul>');
    }
  }
  return parts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
