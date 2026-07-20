import { NextResponse } from 'next/server';

import { postResend } from '@/lib/email/postResend';
import { isSmtpConfigured } from '@/lib/email/smtpTransport';
import type { Tables } from '@/types_db';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  let body: { essay_id?: string };
  try {
    body = (await request.json()) as { essay_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const essayId = body.essay_id?.trim();
  if (!essayId || !UUID_RE.test(essayId)) {
    return NextResponse.json({ error: 'Invalid essay_id' }, { status: 400 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { error: 'Email delivery is not configured' },
      { status: 503 }
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const toEmail = user.email?.trim();
  if (!toEmail) {
    return NextResponse.json(
      { error: 'У аккаунта нет email для отправки' },
      { status: 400 }
    );
  }

  const { data: row, error } = (await (supabase as Sb)
    .from('essay_results')
    .select('id, content, version')
    .eq('id', essayId)
    .eq('user_id', user.id)
    .maybeSingle()) as {
    data: Pick<Tables<'essay_results'>, 'id' | 'content' | 'version'> | null;
    error: { message: string } | null;
  };

  if (error || !row?.content) {
    return NextResponse.json(
      { error: error?.message ?? 'Essay not found' },
      { status: 404 }
    );
  }

  const safe = escapeHtml(row.content);
  const subject = `Ваше эссе (версия ${row.version}) — ScholarshipTop`;
  const html = `<!DOCTYPE html>
<html lang="ru">
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px 40px;">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <p style="margin:0 0 12px;font-size:14px;color:#52525b;">Текст эссе из ScholarshipTop</p>
      <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.65;color:#27272a;">${safe}</pre>
    </div>
  </div>
</body>
</html>`;

  const result = await postResend({
    to: toEmail,
    subject,
    html,
    category: 'transactional'
  });

  if (!result.ok) {
    console.error('[essay:send-email] send failed', result.skipped);
    return NextResponse.json(
      { error: 'Не удалось отправить письмо' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
