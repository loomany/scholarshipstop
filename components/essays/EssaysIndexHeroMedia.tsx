import { AiMentorCtaLink } from '@/components/essay/AiMentorCtaLink';
import { AiMentorHowItWorksVideo } from '@/components/essay/AiMentorHowItWorksVideo';

/**
 * Hero media for /essays index: local MP4 or optional YouTube embed.
 * Local MP4 uses `AiMentorHowItWorksVideo` (poster + left play, then native controls).
 */

const mediaShellClass =
  'w-full overflow-hidden rounded-2xl border border-gray-100 bg-zinc-950 shadow-xl ring-1 ring-gray-100';

/** Same as essay guide card hero in `EssaysGrid`: `aspect-[16/10]`. */
const CARD_COVER_ASPECT = 'aspect-[16/10]';

/** Matches `mediaShellClass` + cover aspect for the essays hero video shell. */
const ESSAYS_LOCAL_VIDEO_SHELL = `relative ${CARD_COVER_ASPECT} ${mediaShellClass}`;

type EssaysIndexHeroMediaProps = {
  /** When set, renders YouTube iframe instead of <video>. */
  youtubeVideoId?: string | null;
  /** Localized label for the AI Mentor CTA pill under the video. */
  ctaLabel?: string;
};

function YoutubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className={`${mediaShellClass} ${CARD_COVER_ASPECT}`}>
      <iframe
        title="Essay guides intro video"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

export function EssaysIndexHeroMedia({
  youtubeVideoId,
  ctaLabel
}: EssaysIndexHeroMediaProps) {
  const id = youtubeVideoId?.trim();
  const media = id ? (
    <YoutubeEmbed videoId={id} />
  ) : (
    <AiMentorHowItWorksVideo
      className={ESSAYS_LOCAL_VIDEO_SHELL}
      playButtonAriaLabel="Play video: Essay guides intro"
    />
  );

  return (
    <div className="flex w-full flex-col gap-2 sm:gap-2.5">
      {media}
      <AiMentorCtaLink label={ctaLabel} />
    </div>
  );
}
