'use client';

import { useCallback, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import clsx from 'clsx';

const VIDEO_SRC = '/videos/IMG_1482.MP4';
/** Hero frame before playback (`public/images/essay-mentor-video-poster.png`). */
const VIDEO_POSTER = '/images/essay-mentor-video-poster.png';

export function AiMentorHowItWorksVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(false);

  const handlePlayStart = useCallback(() => {
    setShowControls(true);
  }, []);

  const handlePointerActivate = useCallback(() => {
    const el = videoRef.current;
    if (!el || !el.paused) return;
    void el.play();
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-zinc-950 shadow-2xl ring-1 ring-zinc-200/60">
      <video
        ref={videoRef}
        controls={showControls}
        playsInline
        preload="auto"
        poster={VIDEO_POSTER}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        className={clsx(
          'h-full w-full bg-black object-cover',
          !showControls && 'cursor-pointer'
        )}
        onPlay={handlePlayStart}
        onClick={!showControls ? handlePointerActivate : undefined}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
      {!showControls ? (
        <button
          type="button"
          onClick={handlePointerActivate}
          className="absolute bottom-3 left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 active:scale-[0.97] sm:bottom-4 sm:left-4 sm:h-12 sm:w-12"
          aria-label="Play video: How the AI Essay Mentor works"
        >
          <Play
            className="ml-0.5 h-5 w-5 text-white sm:h-[1.35rem] sm:w-[1.35rem]"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
