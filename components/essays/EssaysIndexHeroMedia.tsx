import { AiMentorCtaLink } from '@/components/essay/AiMentorCtaLink';

/**
 * Hero media for /essays index: local MP4 or optional YouTube embed.
 * Place the file at `public/videos/IMG_1482.MP4` (or set VIDEO_SRC below).
 */
const VIDEO_SRC = '/videos/IMG_1482.MP4';
const VIDEO_POSTER = '/images/essay-mentor-video-poster.png';

const mediaShellClass =
  'w-full overflow-hidden rounded-2xl border border-gray-100 bg-zinc-950 shadow-xl ring-1 ring-gray-100';

/** Same as essay guide card hero in `EssaysGrid`: `aspect-[16/10]`. */
const CARD_COVER_ASPECT = 'aspect-[16/10]';

type EssaysIndexHeroMediaProps = {
  /** When set, renders YouTube iframe instead of <video>. */
  youtubeVideoId?: string | null;
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

function LocalVideoFile() {
  return (
    <div className={`${mediaShellClass} ${CARD_COVER_ASPECT} w-full`}>
      {/*
        Native controls ⋮ menu is browser UI; it cannot be removed entirely without
        custom controls. Chromium respects `controlsList` / disablePictureInPicture
        to drop Download, PiP, and remote playback entries where supported.
      */}
      <video
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="auto"
        poster={VIDEO_POSTER}
        className="h-full w-full bg-black object-cover"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export function EssaysIndexHeroMedia({ youtubeVideoId }: EssaysIndexHeroMediaProps) {
  const id = youtubeVideoId?.trim();
  const media = id ? (
    <YoutubeEmbed videoId={id} />
  ) : (
    <LocalVideoFile />
  );

  return (
    <div className="flex w-full flex-col gap-2 sm:gap-2.5">
      {media}
      <AiMentorCtaLink />
    </div>
  );
}
