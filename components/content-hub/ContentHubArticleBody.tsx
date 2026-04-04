import type { ContentHubArticle } from '@/lib/content-hub/types';

type ContentHubArticleBodyProps = {
  article: ContentHubArticle;
};

export default function ContentHubArticleBody({
  article
}: ContentHubArticleBodyProps) {
  return (
    <div className="max-w-none">
      <p className="text-lg leading-relaxed text-gray-700">{article.bodyIntro}</p>

      {article.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {section.heading}
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-gray-700">
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed text-gray-700">
              {section.bullets.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      {article.bodyOutro ? (
        <p className="mt-10 text-base font-medium leading-relaxed text-gray-800">
          {article.bodyOutro}
        </p>
      ) : null}
    </div>
  );
}
