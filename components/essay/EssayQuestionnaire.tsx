'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Check,
  Loader2,
  Mic,
  Pencil,
  ScrollText,
  Send,
  Settings,
  Target,
  Trash2,
  Trophy,
  UserRound,
  X
} from 'lucide-react';

import { useToast } from '@/components/ui/Toasts/use-toast';
import { SITE_SEARCH_INPUT_CHROME } from '@/lib/constants/catalogControlBar';
import { SITE_INPUT_FOCUS_CLASS } from '@/lib/constants/siteInputFocus';
import MentorPremiumAccessMessage from '@/components/essay/MentorPremiumAccessMessage';
import { ScholarshipsBrandLoading } from '@/components/scholarships/ScholarshipsBrandLoading';
import ScholarshipRegistrationWallModal from '@/components/scholarships/ScholarshipRegistrationWallModal';
import {
  ESSAY_GUEST_INTERVIEW_STORAGE_KEY,
  ESSAY_GUEST_STORAGE_VERSION
} from '@/lib/essay/guestInterviewStorage';
import {
  INTERVIEW_DRAFT_MIN_THEME_PERCENT,
  INTERVIEW_DRAFT_STRONG_MIN_PERCENT,
  interviewThemesMeetDraftThreshold
} from '@/lib/essay/interviewDraftProgressGate';
import { buildWelcomeAssistantMessage } from '@/lib/essay/mentorOnboarding';
import {
  clampProgress,
  EMPTY_PROGRESS,
  type ThemeProgress
} from '@/lib/essay/interviewerAi';
import { createClient } from '@/utils/supabase/client';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at?: string;
  /** Client-only: premium upsell rendered as an assistant bubble (not persisted to API). */
  variant?: 'premium_access';
};

export type { ThemeProgress };

const THEME_LABELS: {
  key: keyof ThemeProgress;
  label: string;
  Icon: LucideIcon;
}[] = [
  { key: 'background', label: 'Background', Icon: ScrollText },
  { key: 'achievements', label: 'Achievements', Icon: Trophy },
  { key: 'gap', label: 'Motivation', Icon: Target },
  { key: 'personality', label: 'Personality', Icon: UserRound }
];

const INIT_FETCH_MS = 60_000;

function newLocalMessageId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function buildGuestSeedMessages(
  scholarshipTitle?: string | null
): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: newLocalMessageId(),
      role: 'assistant',
      content: buildWelcomeAssistantMessage(scholarshipTitle),
      at: now
    }
  ];
}

/** Shown when the server rejects new mentor chats (trial quota). */
function buildPremiumQuotaExceededMessages(): ChatMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: newLocalMessageId(),
      role: 'assistant',
      content: '',
      variant: 'premium_access',
      at: now
    }
  ];
}

function prependPremiumUpsellIfNeeded(messages: ChatMessage[]): ChatMessage[] {
  if (messages.some((m) => m.variant === 'premium_access')) return messages;
  return [...buildPremiumQuotaExceededMessages(), ...messages];
}

/**
 * Trial mentor quota exhausted: show the subscribe card. If the user has not sent any
 * messages yet, do not keep assistant-only seed/welcome bubbles — avoids a paywall plus
 * a misleading "let's write your essay" greeting at once.
 */
function applyMentorQuotaExhaustedMessages(thread: ChatMessage[]): ChatMessage[] {
  const nonPremium = thread.filter((m) => m.variant !== 'premium_access');
  const hasUser = nonPremium.some((m) => m.role === 'user');
  if (!hasUser) {
    return buildPremiumQuotaExceededMessages();
  }
  return prependPremiumUpsellIfNeeded(thread);
}

/** Same shape as server `UUID_RE` — used to validate persisted ids. */
const CHAT_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseEssayChatQueryParam(
  v: string | null | undefined
): string | null {
  if (!v || !CHAT_ID_UUID_RE.test(v)) return null;
  return v;
}

const ESSAY_CHAT_STORAGE_PREFIX = 'essay_interviewer_chat:';

function essayChatStorageKey(userId: string) {
  return `${ESSAY_CHAT_STORAGE_PREFIX}${userId}`;
}

function readPersistedChatId(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(essayChatStorageKey(userId));
    return v && CHAT_ID_UUID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

function writePersistedChatId(userId: string, chatId: string) {
  try {
    localStorage.setItem(essayChatStorageKey(userId), chatId);
  } catch {
    /* ignore quota / private mode */
  }
}

function clearPersistedChatId(userId: string) {
  try {
    localStorage.removeItem(essayChatStorageKey(userId));
  } catch {
    /* ignore */
  }
}

/** Prefer WebM+Opus; Safari often needs MP4/AAC — see `pickVoiceRecorderMime`. */
const VOICE_RECORD_MIME_FALLBACK_ORDER = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/ogg;codecs=opus'
] as const;

function pickVoiceRecorderMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of VOICE_RECORD_MIME_FALLBACK_ORDER) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

function voiceBlobFileName(mime: string): string {
  if (mime.includes('mp4')) return 'recording.m4a';
  if (mime.includes('ogg')) return 'recording.ogg';
  return 'recording.webm';
}

type InitPayload = {
  chat_id: string;
  messages: ChatMessage[];
  progress?: ThemeProgress;
  ready_to_generate?: boolean;
};

class MentorTrialQuotaExceededError extends Error {
  constructor() {
    super('trial_quota_exceeded');
    this.name = 'MentorTrialQuotaExceededError';
  }
}

async function requestInterviewInit(
  signal?: AbortSignal,
  scholarshipTitle?: string | null
): Promise<InitPayload> {
  const res = await fetch('/api/interviewer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      action: 'init',
      ...(scholarshipTitle?.trim()
        ? { scholarship_title: scholarshipTitle.trim() }
        : {})
    }),
    signal
  });
  const data = (await res.json()) as {
    error?: string;
    code?: string;
    chat_id?: string;
    messages?: ChatMessage[];
    progress?: ThemeProgress;
    ready_to_generate?: boolean;
  };
  if (!res.ok) {
    if (res.status === 402 && data.code === 'trial_quota_exceeded') {
      throw new MentorTrialQuotaExceededError();
    }
    throw new Error(data.error || `Error ${res.status}`);
  }
  if (!data.chat_id || !data.messages) {
    throw new Error('Invalid server response');
  }
  return {
    chat_id: data.chat_id,
    messages: data.messages,
    progress: data.progress,
    ready_to_generate: data.ready_to_generate
  };
}

async function requestInterviewResume(
  chatId: string,
  signal?: AbortSignal
): Promise<InitPayload> {
  const res = await fetch('/api/interviewer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action: 'resume', chat_id: chatId }),
    signal
  });
  const data = (await res.json()) as {
    error?: string;
    chat_id?: string;
    messages?: ChatMessage[];
    progress?: ThemeProgress;
    ready_to_generate?: boolean;
  };
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  if (!data.chat_id || !data.messages) {
    throw new Error('Invalid server response');
  }
  return {
    chat_id: data.chat_id,
    messages: data.messages,
    progress: data.progress,
    ready_to_generate: data.ready_to_generate
  };
}

type Props = {
  onComplete?: () => void;
  /**
   * When opening `/essay?chat=<uuid>` (e.g. from the essay result page), resume this chat
   * on first load instead of only the last persisted chat id.
   */
  initialChatIdFromQuery?: string | null;
  /** From `/essay?scholarship=` — custom welcome + LLM context (e.g. scholarship detail CTA). */
  initialScholarshipTitle?: string | null;
};

export function EssayQuestionnaire({
  onComplete,
  initialChatIdFromQuery = null,
  initialScholarshipTitle = null
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const { hasSubscription, subscriptionReady } = useSubscriptionAccess(userId);
  const mentorPaywallLocked = useMemo(
    () => !userId || !subscriptionReady || !hasSubscription,
    [userId, subscriptionReady, hasSubscription]
  );
  const [authChecked, setAuthChecked] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [progress, setProgress] = useState<ThemeProgress>(EMPTY_PROGRESS);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [messageMutating, setMessageMutating] = useState(false);
  const [devBypassing, setDevBypassing] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const devMenuRef = useRef<HTMLDivElement>(null);

  /** Latest essay_results row for this mentor chat (any version chain). */
  const [latestEssayResultId, setLatestEssayResultId] = useState<string | null>(
    null
  );
  const [draftLinkResolved, setDraftLinkResolved] = useState(false);
  const [registrationWallOpen, setRegistrationWallOpen] = useState(false);
  /** Guest-only: after first LLM reply, subsequent turns omit onboarding system appendix. */
  const [guestMentorInterviewStarted, setGuestMentorInterviewStarted] =
    useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mountedRef = useRef(true);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!devMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!devMenuRef.current?.contains(e.target as Node)) {
        setDevMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDevMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [devMenuOpen]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const applyInitPayload = useCallback(
    (data: InitPayload, persistForUserId?: string | null) => {
      setChatId(data.chat_id);
      setMessages(data.messages);
      setProgress(data.progress ?? EMPTY_PROGRESS);
      setInput('');
      setEditingMessageId(null);
      setEditDraft('');
      if (persistForUserId) {
        writePersistedChatId(persistForUserId, data.chat_id);
      }
    },
    []
  );

  const persistGuestBlob = useCallback(
    (
      nextMessages: ChatMessage[],
      nextProgress: ThemeProgress,
      ready?: boolean,
      meta?: {
        scholarshipTitle?: string | null;
        mentorInterviewStarted?: boolean;
      }
    ) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(
          ESSAY_GUEST_INTERVIEW_STORAGE_KEY,
          JSON.stringify({
            v: ESSAY_GUEST_STORAGE_VERSION,
            messages: nextMessages,
            progress: nextProgress,
            ready_to_generate: ready ?? false,
            scholarship_title: meta?.scholarshipTitle ?? null,
            mentor_interview_started: meta?.mentorInterviewStarted ?? false
          })
        );
      } catch {
        /* quota / private mode */
      }
    },
    []
  );

  const tryClaimGuestAndApply = useCallback(
    async (uid: string): Promise<boolean> => {
      if (typeof window === 'undefined') return false;
      const raw = localStorage.getItem(ESSAY_GUEST_INTERVIEW_STORAGE_KEY);
      if (!raw) return false;
      let parsed: {
        v?: number;
        messages?: ChatMessage[];
        progress?: ThemeProgress;
        ready_to_generate?: boolean;
        scholarship_title?: string | null;
        mentor_interview_started?: boolean;
      };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        return false;
      }
      if (
        parsed.v !== ESSAY_GUEST_STORAGE_VERSION ||
        !Array.isArray(parsed.messages) ||
        parsed.messages.length === 0
      ) {
        return false;
      }
      try {
        const res = await fetch('/api/interviewer/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            messages: parsed.messages,
            progress: parsed.progress ?? EMPTY_PROGRESS,
            ready_to_generate: parsed.ready_to_generate ?? false,
            scholarship_title: parsed.scholarship_title ?? null,
            mentor_interview_started: parsed.mentor_interview_started === true,
            mentor_profile_prompt_sent: false
          })
        });
        const data = (await res.json()) as {
          error?: string;
          chat_id?: string;
          messages?: ChatMessage[];
          progress?: ThemeProgress;
          ready_to_generate?: boolean;
        };
        if (!res.ok) {
          toast({
            variant: 'destructive',
            title: 'Could not save your chat',
            description: data.error ?? `Error ${res.status}`
          });
          return false;
        }
        if (!data.chat_id || !data.messages) return false;
        localStorage.removeItem(ESSAY_GUEST_INTERVIEW_STORAGE_KEY);
        applyInitPayload(
          {
            chat_id: data.chat_id,
            messages: data.messages,
            progress: data.progress ?? EMPTY_PROGRESS,
            ready_to_generate: data.ready_to_generate
          },
          uid
        );
        return true;
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Could not save your chat',
          description: e instanceof Error ? e.message : 'Error'
        });
        return false;
      }
    },
    [applyInitPayload, toast]
  );

  /** After loading a chat from the server: optionally prepend the inline Premium banner when trial dialogue quota is exhausted (e.g. resumed chat). Skip prepend after a fresh init so the first dialogue stays clean. */
  const syncMentorTrialBanner = useCallback(
    async (options?: { prependBanner?: boolean }) => {
      try {
        const res = await fetch('/api/interviewer/mentor-trial-status', {
          credentials: 'same-origin'
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          mentor_dialogue_exhausted?: boolean;
        };
        if (!data.mentor_dialogue_exhausted) return;
        if (options?.prependBanner) {
          setMessages((prev) => applyMentorQuotaExhaustedMessages(prev));
        }
      } catch {
        /* ignore */
      }
    },
    []
  );

  const initChat = useCallback(async () => {
    if (userId && !subscriptionReady) return;
    if (mentorPaywallLocked) {
      setRegistrationWallOpen(true);
      return;
    }
    try {
      const st = await fetch('/api/interviewer/mentor-trial-status', {
        credentials: 'same-origin'
      });
      if (st.ok) {
        const trialData = (await st.json()) as {
          mentor_dialogue_exhausted?: boolean;
        };
        if (trialData.mentor_dialogue_exhausted) {
          setMessages((prev) => applyMentorQuotaExhaustedMessages(prev));
          setRegistrationWallOpen(true);
          return;
        }
      }
    } catch {
      /* continue — server will still reject init if needed */
    }

    setBootLoading(true);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), INIT_FETCH_MS);
    try {
      const data = await requestInterviewInit(ac.signal, initialScholarshipTitle);
      applyInitPayload(data, userId);
      await syncMentorTrialBanner({ prependBanner: false });
    } catch (e) {
      if (e instanceof MentorTrialQuotaExceededError) {
        setMessages((prev) => applyMentorQuotaExhaustedMessages(prev));
        setRegistrationWallOpen(true);
      } else if (e instanceof Error && e.name === 'AbortError') {
        toast({
          variant: 'destructive',
          title: 'Request timed out',
          description: 'The server took too long to respond. Check your connection and try again.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Couldn’t start chat',
          description: e instanceof Error ? e.message : 'Error'
        });
      }
    } finally {
      clearTimeout(timer);
      setBootLoading(false);
    }
  }, [
    applyInitPayload,
    initialScholarshipTitle,
    mentorPaywallLocked,
    persistGuestBlob,
    subscriptionReady,
    syncMentorTrialBanner,
    toast,
    userId
  ]);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), INIT_FETCH_MS);

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!alive) return;

        setUserId(user?.id ?? null);
        setAuthChecked(true);

        if (!user) {
          try {
            const raw = localStorage.getItem(ESSAY_GUEST_INTERVIEW_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as {
                v?: number;
                messages?: ChatMessage[];
                progress?: ThemeProgress;
                ready_to_generate?: boolean;
                mentor_interview_started?: boolean;
              };
              if (
                parsed.v === ESSAY_GUEST_STORAGE_VERSION &&
                Array.isArray(parsed.messages) &&
                parsed.messages.length > 0
              ) {
                setMessages(parsed.messages);
                setProgress(
                  clampProgress(parsed.progress ?? EMPTY_PROGRESS)
                );
                setChatId(null);
                setGuestMentorInterviewStarted(
                  parsed.mentor_interview_started === true
                );
                if (alive) setBootLoading(false);
                return;
              }
            }
          } catch {
            /* ignore corrupt guest blob */
          }
          const seed = buildGuestSeedMessages(initialScholarshipTitle);
          setMessages(seed);
          setProgress(EMPTY_PROGRESS);
          setChatId(null);
          setGuestMentorInterviewStarted(false);
          persistGuestBlob(seed, EMPTY_PROGRESS, false, {
            scholarshipTitle: initialScholarshipTitle,
            mentorInterviewStarted: false
          });
          if (alive) setBootLoading(false);
          return;
        }

        const fromUrl =
          initialChatIdFromQuery &&
          CHAT_ID_UUID_RE.test(initialChatIdFromQuery)
            ? initialChatIdFromQuery
            : null;

        if (fromUrl) {
          try {
            const resumed = await requestInterviewResume(fromUrl, ac.signal);
            if (!alive) return;
            applyInitPayload(resumed, user.id);
            localStorage.removeItem(ESSAY_GUEST_INTERVIEW_STORAGE_KEY);
            await syncMentorTrialBanner({ prependBanner: true });
            return;
          } catch {
            if (!alive) return;
            clearPersistedChatId(user.id);
          }
        }

        const claimed = await tryClaimGuestAndApply(user.id);
        if (!alive) return;
        if (claimed) {
          await syncMentorTrialBanner({ prependBanner: true });
          return;
        }

        const savedChatId = readPersistedChatId(user.id);
        if (savedChatId) {
          try {
            const resumed = await requestInterviewResume(savedChatId, ac.signal);
            if (!alive) return;
            applyInitPayload(resumed, user.id);
            await syncMentorTrialBanner({ prependBanner: true });
            return;
          } catch {
            if (!alive) return;
            clearPersistedChatId(user.id);
          }
        }

        const data = await requestInterviewInit(ac.signal, initialScholarshipTitle);
        if (!alive) return;

        applyInitPayload(data, user.id);
        await syncMentorTrialBanner({ prependBanner: false });
      } catch (e) {
        if (!alive) return;
        if (e instanceof MentorTrialQuotaExceededError) {
          setChatId(null);
          setMessages((prev) => applyMentorQuotaExhaustedMessages(prev));
          setProgress(EMPTY_PROGRESS);
          setInput('');
        } else if (e instanceof Error && e.name === 'AbortError') {
          toast({
            variant: 'destructive',
            title: 'Couldn’t load chat',
            description:
              'The request was interrupted or timed out. Refresh the page or try again in a moment.'
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Couldn’t start chat',
            description: e instanceof Error ? e.message : 'Error'
          });
        }
      } finally {
        clearTimeout(timer);
        if (alive) setBootLoading(false);
      }
    })();

    return () => {
      alive = false;
      clearTimeout(timer);
      ac.abort();
    };
    // Mount-only load; `toast` omitted from deps to avoid resetting the chat on toast identity changes.
    // `initialChatIdFromQuery` is read once per mount via the dependency below so `/essay?chat=` deep-links work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    applyInitPayload,
    initialChatIdFromQuery,
    initialScholarshipTitle,
    syncMentorTrialBanner
  ]);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextId = session?.user?.id ?? null;
      setUserId(nextId);
      if (event === 'SIGNED_IN' && session?.user?.id) {
        const claimed = await tryClaimGuestAndApply(session.user.id);
        if (claimed) {
          toast({
            title: 'You’re signed in',
            description:
              'Your conversation was saved. You can generate your draft when you’re ready.'
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [tryClaimGuestAndApply, toast]);

  useEffect(() => {
    if (!chatId || !userId) {
      setLatestEssayResultId(null);
      setDraftLinkResolved(true);
      return;
    }

    setDraftLinkResolved(false);
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data, error } = await supabase
        .from('essay_results')
        .select('id')
        .eq('essay_chat_id', chatId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const row = data as { id: string } | null;
      if (error || !row?.id) {
        setLatestEssayResultId(null);
      } else {
        setLatestEssayResultId(row.id);
      }
      setDraftLinkResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId, userId]);

  const applyServerChatResponse = useCallback(
    (data: { messages?: ChatMessage[]; progress?: ThemeProgress }) => {
      if (data.messages) setMessages(data.messages);
      if (data.progress) setProgress(data.progress);
    },
    []
  );

  const submitGuestMessage = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || sending || generating || devBypassing) return false;
      if (messages.some((m) => m.variant === 'premium_access')) return false;
      if (messages.length === 0) return false;
      if (mentorPaywallLocked) {
        setRegistrationWallOpen(true);
        return false;
      }
      setSending(true);
      try {
        const res = await fetch('/api/interviewer/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            messages,
            user_message: t,
            scholarship_title: initialScholarshipTitle?.trim() || null,
            mentor_interview_started: guestMentorInterviewStarted
          })
        });
        const data = (await res.json()) as {
          error?: string;
          messages?: ChatMessage[];
          progress?: ThemeProgress;
          ready_to_generate?: boolean;
          mentor_interview_started?: boolean;
        };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        if (data.messages) {
          setMessages(data.messages);
          const nextProgress = data.progress ?? EMPTY_PROGRESS;
          setProgress(nextProgress);
          if (data.mentor_interview_started === true) {
            setGuestMentorInterviewStarted(true);
          }
          persistGuestBlob(
            data.messages,
            nextProgress,
            data.ready_to_generate,
            {
              scholarshipTitle: initialScholarshipTitle,
              mentorInterviewStarted:
                data.mentor_interview_started === true ||
                guestMentorInterviewStarted
            }
          );
        }
        return true;
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Сообщение не отправлено',
          description: e instanceof Error ? e.message : 'Ошибка'
        });
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      devBypassing,
      generating,
      guestMentorInterviewStarted,
      initialScholarshipTitle,
      mentorPaywallLocked,
      messages,
      persistGuestBlob,
      sending,
      toast
    ]
  );

  const submitUserMessageInChat = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || sending || generating || devBypassing) return false;
      if (messages.some((m) => m.variant === 'premium_access')) return false;
      if (!userId) {
        return submitGuestMessage(t);
      }
      if (!subscriptionReady) return false;
      if (!hasSubscription) {
        setRegistrationWallOpen(true);
        return false;
      }
      if (!chatId) return false;
      setSending(true);
      try {
        const res = await fetch('/api/interviewer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ chat_id: chatId, message: t })
        });
        const data = (await res.json()) as {
          error?: string;
          messages?: ChatMessage[];
          progress?: ThemeProgress;
          ready_to_generate?: boolean;
        };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        applyServerChatResponse(data);
        return true;
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Сообщение не отправлено',
          description: e instanceof Error ? e.message : 'Ошибка'
        });
        return false;
      } finally {
        setSending(false);
      }
    },
    [
      applyServerChatResponse,
      chatId,
      devBypassing,
      generating,
      hasSubscription,
      sending,
      submitGuestMessage,
      subscriptionReady,
      toast,
      userId,
      messages
    ]
  );

  const conversationReady = useMemo(
    () => Boolean(userId ? chatId : messages.length > 0),
    [userId, chatId, messages.length]
  );

  /** Trial / paywall: inline Premium card is shown — block typing, voice, send, draft. */
  const mentorPremiumLocksComposer = useMemo(
    () => messages.some((m) => m.variant === 'premium_access'),
    [messages]
  );

  const chatComposerEnabled = useMemo(
    () => conversationReady && !mentorPremiumLocksComposer,
    [conversationReady, mentorPremiumLocksComposer]
  );

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const toggleVoiceInput = useCallback(async () => {
    if (mentorPaywallLocked) {
      setRegistrationWallOpen(true);
      return;
    }
    if (
      isTranscribing ||
      sending ||
      generating ||
      devBypassing ||
      messageMutating ||
      !chatComposerEnabled
    )
      return;

    if (isRecording) {
      setIsRecording(false);
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') {
        rec.stop();
      }
      return;
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Microphone unavailable',
        description: 'This browser does not support audio recording.'
      });
      return;
    }

    const voiceMime = pickVoiceRecorderMime();
    if (!voiceMime) {
      toast({
        variant: 'destructive',
        title: 'Recording format not supported',
        description:
          'Your browser cannot record audio in a supported format. Try Safari (updated), Chrome, or Edge.'
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const rec = new MediaRecorder(stream, { mimeType: voiceMime });
      mediaRecorderRef.current = rec;

      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      rec.onstop = () => {
        stopMediaStream();
        mediaRecorderRef.current = null;

        const blob = new Blob(audioChunksRef.current, {
          type: voiceMime
        });
        audioChunksRef.current = [];

        if (blob.size < 200) {
          toast({
            variant: 'destructive',
            title: 'Recording too short',
            description: 'Record a longer phrase and try again.'
          });
          return;
        }

        void (async () => {
          if (mountedRef.current) setIsTranscribing(true);
          try {
            const fd = new FormData();
            fd.append('audio', blob, voiceBlobFileName(voiceMime));
            const res = await fetch('/api/voice-to-text', {
              method: 'POST',
              body: fd,
              credentials: 'same-origin'
            });
            const data = (await res.json()) as { error?: string; text?: string };
            if (!res.ok) {
              throw new Error(data.error || `Error ${res.status}`);
            }
            const text = (data.text ?? '').trim();
            if (!text) {
              throw new Error('Empty transcription');
            }
            if (!mountedRef.current) return;
            void submitUserMessageInChat(text);
          } catch (e) {
            if (mountedRef.current) {
              toast({
                variant: 'destructive',
                title: 'Voice input failed',
                description: e instanceof Error ? e.message : 'Error'
              });
            }
          } finally {
            if (mountedRef.current) setIsTranscribing(false);
          }
        })();
      };

      rec.start();
      setIsRecording(true);
    } catch (e) {
      stopMediaStream();
      const denied =
        e instanceof DOMException &&
        (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
      toast({
        variant: 'destructive',
        title: denied ? 'Microphone access denied' : 'Couldn’t record',
        description: denied
          ? 'Allow microphone access for this site in your browser settings.'
          : e instanceof Error
            ? e.message
            : 'Recording error'
      });
    }
  }, [
    chatComposerEnabled,
    devBypassing,
    generating,
    isRecording,
    isTranscribing,
    messageMutating,
    sending,
    mentorPaywallLocked,
    stopMediaStream,
    submitUserMessageInChat,
    toast
  ]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const ok = await submitUserMessageInChat(text);
    if (ok) setInput('');
  };

  const saveEditedUserMessage = async () => {
    if (!editingMessageId || messageMutating || devBypassing) return;
    const t = editDraft.trim();
    if (!t) return;

    if (!userId) {
      setMessageMutating(true);
      try {
        const payloadMessages = messages.filter(
          (m) => m.variant !== 'premium_access'
        );
        const res = await fetch('/api/interviewer/guest-message', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            messages: payloadMessages,
            message_id: editingMessageId,
            new_text: t
          })
        });
        const data = (await res.json()) as {
          error?: string;
          messages?: ChatMessage[];
          progress?: ThemeProgress;
          ready_to_generate?: boolean;
        };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        if (data.messages) {
          setMessages(data.messages);
          const nextProgress = data.progress ?? EMPTY_PROGRESS;
          setProgress(nextProgress);
          persistGuestBlob(
            data.messages,
            nextProgress,
            data.ready_to_generate ?? false,
            {
              scholarshipTitle: initialScholarshipTitle,
              mentorInterviewStarted: guestMentorInterviewStarted
            }
          );
        }
        setEditingMessageId(null);
        setEditDraft('');
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t save',
          description: e instanceof Error ? e.message : 'Error'
        });
      } finally {
        setMessageMutating(false);
      }
      return;
    }

    if (!chatId) return;
    setMessageMutating(true);
    try {
      const res = await fetch('/api/essay/message', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          chat_id: chatId,
          message_id: editingMessageId,
          new_text: t
        })
      });
      const data = (await res.json()) as {
        error?: string;
        messages?: ChatMessage[];
        progress?: ThemeProgress;
        ready_to_generate?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      applyServerChatResponse(data);
      setEditingMessageId(null);
      setEditDraft('');
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Couldn’t save',
        description: e instanceof Error ? e.message : 'Error'
      });
    } finally {
      setMessageMutating(false);
    }
  };

  const deleteUserMessageById = async (messageId: string) => {
    if (messageMutating || devBypassing) return;

    if (!userId) {
      setMessageMutating(true);
      try {
        const payloadMessages = messages.filter(
          (m) => m.variant !== 'premium_access'
        );
        const res = await fetch('/api/interviewer/guest-message', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            messages: payloadMessages,
            message_id: messageId
          })
        });
        const data = (await res.json()) as {
          error?: string;
          messages?: ChatMessage[];
          progress?: ThemeProgress;
          ready_to_generate?: boolean;
        };
        if (!res.ok) {
          throw new Error(data.error || `Error ${res.status}`);
        }
        if (data.messages) {
          setMessages(data.messages);
          const nextProgress = data.progress ?? EMPTY_PROGRESS;
          setProgress(nextProgress);
          persistGuestBlob(
            data.messages,
            nextProgress,
            data.ready_to_generate ?? false,
            {
              scholarshipTitle: initialScholarshipTitle,
              mentorInterviewStarted: guestMentorInterviewStarted
            }
          );
        }
        if (editingMessageId === messageId) {
          setEditingMessageId(null);
          setEditDraft('');
        }
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Couldn’t delete',
          description: e instanceof Error ? e.message : 'Error'
        });
      } finally {
        setMessageMutating(false);
      }
      return;
    }

    if (!chatId) return;
    setMessageMutating(true);
    try {
      const res = await fetch('/api/essay/message', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId
        })
      });
      const data = (await res.json()) as {
        error?: string;
        messages?: ChatMessage[];
        progress?: ThemeProgress;
        ready_to_generate?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      applyServerChatResponse(data);
      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setEditDraft('');
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Couldn’t delete',
        description: e instanceof Error ? e.message : 'Error'
      });
    } finally {
      setMessageMutating(false);
    }
  };

  const cancelEditUserMessage = () => {
    setEditingMessageId(null);
    setEditDraft('');
  };

  const canGenerate = interviewThemesMeetDraftThreshold(progress);

  const generateDraftButtonTitle = useMemo(() => {
    if (canGenerate) {
      return 'Generate an essay draft from your interview answers';
    }
    const below = THEME_LABELS.filter(
      ({ key }) => progress[key] < INTERVIEW_DRAFT_MIN_THEME_PERCENT
    ).map(
      ({ key, label }) =>
        `${label} ${Math.round(progress[key])}%`
    );
    if (below.length === 0) {
      return `Each of the four topics must be at least ${INTERVIEW_DRAFT_MIN_THEME_PERCENT}%.`;
    }
    return `Need ≥${INTERVIEW_DRAFT_MIN_THEME_PERCENT}% on all topics (Background, Achievements, Motivation, Personality). Still below threshold: ${below.join('; ')}.`;
  }, [canGenerate, progress]);

  const returnToTemplateTitle =
    'Open your saved draft. The Generate Draft button returns after you start a New Chat.';

  const showReturnToTemplate =
    draftLinkResolved && Boolean(latestEssayResultId);

  const handleDevBypass = async () => {
    if (!userId || devBypassing) return;
    setDevBypassing(true);
    try {
      const res = await fetch('/api/essay/dev-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ user_id: userId })
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      if (!data.id) throw new Error('No essay id');
      toast({
        title: '[DEV] Placeholder created',
        description: 'Opening the result page…'
      });
      onComplete?.();
      router.push(`/essay/${data.id}`);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: '[DEV] Could not create placeholder',
        description: e instanceof Error ? e.message : 'Error'
      });
    } finally {
      setDevBypassing(false);
    }
  };

  const returnToEssayTemplate = () => {
    if (!latestEssayResultId || generating || devBypassing) return;
    router.push(`/essays/u/${latestEssayResultId}`);
  };

  const generateEssay = async () => {
    if (userId && !subscriptionReady) return;
    if (!userId || !hasSubscription) {
      setRegistrationWallOpen(true);
      return;
    }
    if (!chatId || generating || devBypassing || !canGenerate) return;
    if (messages.some((m) => m.variant === 'premium_access')) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/essay/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ chat_id: chatId })
      });
      const data = (await res.json()) as {
        error?: string;
        id?: string;
        draft_quality_tier?: 'preview' | 'standard';
      };
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }
      if (!data.id) throw new Error('No essay id');
      const previewQs =
        data.draft_quality_tier === 'preview' ? '?mentorPreview=1' : '';
      const nextPath = `/essays/u/${data.id}${previewQs}`;
      setLatestEssayResultId(data.id);
      toast({
        title: 'Draft ready',
        description: 'Opening your essay…'
      });
      try {
        onComplete?.();
      } catch {
        /* must not block redirect */
      }
      // Full navigation is more reliable here than client router alone (users were left on chat
      // with only «Return to template»).
      if (typeof window !== 'undefined') {
        window.location.assign(nextPath);
      } else {
        router.replace(nextPath);
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: e instanceof Error ? e.message : 'Error'
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!authChecked || bootLoading) {
    return (
      <div className="w-full min-h-[320px]">
        <ScholarshipsBrandLoading
          density="compact"
          label=""
          showTopAccentBar
          className="min-h-[300px] py-10"
        />
      </div>
    );
  }

  return (
    <>
      <div
        className="relative isolate flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12)] [&_a]:touch-manipulation [&_button]:touch-manipulation [&_textarea]:touch-manipulation max-sm:h-full max-sm:min-h-0 max-sm:max-h-[min(92dvh,calc(100dvh-9rem))] sm:max-h-none sm:min-h-0 sm:overflow-visible"
      >
        {process.env.NODE_ENV === 'development' ? (
          <div
            ref={devMenuRef}
            className="absolute left-2 top-2 z-[60] sm:left-3 sm:top-3"
          >
            <button
              type="button"
              onClick={() => setDevMenuOpen((o) => !o)}
              aria-expanded={devMenuOpen}
              aria-haspopup="menu"
              aria-label="Local developer menu"
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100/90 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/55 focus-visible:ring-offset-2"
            >
              <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
            {devMenuOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),17rem)] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                <p className="border-b border-zinc-100 px-3 py-2 text-[10px] leading-snug text-zinc-500">
                  Local only (NODE_ENV=development). Shortcut for UI testing.
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDevMenuOpen(false);
                    void handleDevBypass();
                  }}
                  disabled={
                    devBypassing ||
                    sending ||
                    generating ||
                    isRecording ||
                    isTranscribing ||
                    messageMutating
                  }
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {devBypassing ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                  ) : null}
                  Generate full essay
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="shrink-0 border-b border-zinc-100 bg-zinc-50/80 px-3 py-3 sm:px-6 sm:py-4">
          <div className="mb-2 space-y-1.5 sm:mb-3 sm:space-y-2">
            <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-3 sm:gap-y-0">
              <div className="hidden min-w-0 sm:block" aria-hidden />
              <h2 className="px-1 text-center text-lg font-bold leading-snug text-zinc-900 sm:col-start-2 sm:justify-self-center sm:px-0 sm:text-xl">
                Your answers shape the draft
              </h2>
              <div className="flex w-full max-w-xs flex-col items-stretch gap-1.5 justify-self-center sm:col-start-3 sm:w-auto sm:max-w-none sm:items-end sm:justify-self-end">
                <button
                  type="button"
                  onClick={initChat}
                  disabled={
                    sending ||
                    generating ||
                    devBypassing ||
                    isRecording ||
                    isTranscribing ||
                    messageMutating
                  }
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-emerald-500"
                >
                  New Chat
                </button>
              </div>
            </div>
            <div className="max-w-xl text-xs leading-relaxed text-zinc-500 sm:text-sm">
              <p>
                <strong className="font-medium text-zinc-600">
                  The indicators show your material&apos;s readiness.
                </strong>{' '}
                Detailed answers fill the progress bars faster.
              </p>
              <p className="mt-1.5 text-[11px] leading-snug text-zinc-500 sm:hidden">
                Basic draft from {INTERVIEW_DRAFT_MIN_THEME_PERCENT}% on all topics; strong essay from{' '}
                {INTERVIEW_DRAFT_STRONG_MIN_PERCENT}%+.
              </p>
              <ul className="mt-2 hidden list-disc space-y-1 pl-4 marker:text-zinc-400 sm:block">
                <li>
                  <strong className="font-medium text-zinc-600">
                    From {INTERVIEW_DRAFT_MIN_THEME_PERCENT}% across all topics:
                  </strong>{' '}
                  you can generate a short, basic draft.
                </li>
                <li>
                  <strong className="font-medium text-zinc-600">
                    From {INTERVIEW_DRAFT_STRONG_MIN_PERCENT}% across all topics:
                  </strong>{' '}
                  the perfect moment to generate a strong, detailed essay.
                </li>
              </ul>
            </div>
          </div>
        <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
          {THEME_LABELS.map(({ key, label, Icon }) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-[#FF7A1A]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {Math.round(progress[key])}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200/90">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progress[key]))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-0 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto px-2 py-3 [-webkit-overflow-scrolling:touch] touch-pan-y max-sm:min-h-[6rem] max-sm:flex-1 max-sm:px-3 sm:max-h-[min(60vh,520px)] sm:flex-none sm:px-6 sm:py-4">
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <div key={m.id} className="flex justify-start">
              <div
                className={`max-w-[min(100%,22rem)] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3 py-3 text-[15px] leading-relaxed text-zinc-800 shadow-sm max-sm:max-w-[88%] sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-sm ${
                  m.variant === 'premium_access'
                    ? 'border-emerald-200/80 bg-gradient-to-b from-white to-zinc-50/90 shadow-[0_16px_40px_-20px_rgba(16,185,129,0.25)]'
                    : ''
                }`}
              >
                {m.variant === 'premium_access' ? (
                  <MentorPremiumAccessMessage />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div
                className={`relative max-w-[min(100%,22rem)] rounded-2xl rounded-br-md px-3 py-3 text-[15px] leading-relaxed shadow-sm max-sm:max-w-[88%] sm:max-w-[85%] sm:px-4 sm:py-3 sm:text-sm ${
                  editingMessageId === m.id
                    ? 'border border-zinc-200 bg-white text-zinc-800'
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {editingMessageId !== m.id ? (
                  <>
                    <div className="absolute right-2 top-2 z-10 flex gap-0.5 opacity-90 transition-opacity hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessageId(m.id);
                          setEditDraft(m.content);
                        }}
                        disabled={
                          messageMutating ||
                          sending ||
                          generating ||
                          devBypassing ||
                          isTranscribing
                        }
                        className="rounded-md bg-white/15 p-1 text-white hover:bg-white/25 disabled:opacity-40"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteUserMessageById(m.id)}
                        disabled={
                          messageMutating ||
                          sending ||
                          generating ||
                          devBypassing ||
                          isTranscribing
                        }
                        className="rounded-md bg-white/15 p-1 text-white hover:bg-white/25 disabled:opacity-40"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap pr-14">{m.content}</p>
                  </>
                ) : (
                  <div className="min-w-[min(100%,280px)]">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={4}
                      disabled={messageMutating}
                      className={`w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 disabled:opacity-60 ${SITE_INPUT_FOCUS_CLASS}`}
                    />
                    <div className="mt-2 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEditedUserMessage()}
                        disabled={messageMutating || !editDraft.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-45"
                      >
                        {messageMutating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditUserMessage}
                        disabled={messageMutating}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-45"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}
        {sending && !generating && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
              Mentor is typing…
            </div>
          </div>
        )}
        {generating && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
              Building your draft…
            </div>
          </div>
        )}
        {isTranscribing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Transcribing speech…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="relative z-10 shrink-0 border-t border-zinc-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:p-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            disabled={
              sending ||
              generating ||
              devBypassing ||
              isTranscribing ||
              messageMutating ||
              !chatComposerEnabled
            }
            placeholder="Type your answer…"
            rows={1}
            className={`min-h-[52px] min-w-0 flex-1 resize-none px-4 py-[15px] text-left text-sm leading-5 text-zinc-900 disabled:opacity-60 ${SITE_SEARCH_INPUT_CHROME}`}
          />
          <div className="flex w-full shrink-0 items-stretch justify-end gap-2 sm:w-auto sm:min-w-0">
            <button
              type="button"
              onClick={() => void toggleVoiceInput()}
              disabled={
                sending ||
                generating ||
                devBypassing ||
                isTranscribing ||
                messageMutating ||
                !chatComposerEnabled
              }
              className={`inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border shadow-md transition disabled:opacity-45 ${
                isRecording
                  ? 'animate-mic-recording-pulse border-[#FFB27D] text-[#FF7A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A1A]/35 focus-visible:ring-offset-2'
                  : 'border-[#E6670C]/35 bg-[#FF7A1A] text-white shadow-orange-500/25 hover:bg-[#E6670C]'
              }`}
              aria-pressed={isRecording}
              aria-label={
                isRecording ? 'Stop recording' : 'Voice input'
              }
              title={
                isRecording
                  ? 'Click again to stop and transcribe'
                  : 'Record with microphone'
              }
            >
              {isTranscribing ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Mic className="h-5 w-5" aria-hidden />
              )}
            </button>
            {showReturnToTemplate ? (
              <button
                type="button"
                onClick={() => void returnToEssayTemplate()}
                disabled={
                  generating ||
                  devBypassing ||
                  sending ||
                  isTranscribing ||
                  isRecording ||
                  messageMutating ||
                  !chatComposerEnabled
                }
                title={returnToTemplateTitle}
                aria-label="Return to template — open your saved draft"
                className="inline-flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-xl bg-emerald-500 px-3 text-center text-xs font-semibold leading-snug text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-200 sm:min-w-[8.5rem] sm:flex-initial"
              >
                Return to template
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void generateEssay()}
                disabled={
                  !draftLinkResolved ||
                  !canGenerate ||
                  generating ||
                  devBypassing ||
                  sending ||
                  isTranscribing ||
                  isRecording ||
                  messageMutating ||
                  !chatComposerEnabled
                }
                title={generateDraftButtonTitle}
                aria-label={
                  generating
                    ? 'Preparing draft…'
                    : 'Generate essay draft'
                }
                className="inline-flex h-[52px] min-w-0 flex-1 items-center justify-center rounded-xl bg-emerald-500 px-3 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-200 sm:min-w-[8.75rem] sm:flex-initial sm:whitespace-nowrap sm:text-sm"
              >
                {generating ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  'Generate draft'
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={
                sending ||
                generating ||
                devBypassing ||
                isTranscribing ||
                messageMutating ||
                !input.trim() ||
                !chatComposerEnabled
              }
              className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none disabled:hover:bg-zinc-200"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

      <ScholarshipRegistrationWallModal
        open={registrationWallOpen}
        onClose={() => setRegistrationWallOpen(false)}
        variant="essay"
        signedInWithoutSubscription={Boolean(userId && !hasSubscription)}
      />
    </>
  );
}
