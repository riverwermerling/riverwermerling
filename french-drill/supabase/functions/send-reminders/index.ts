// Supabase Edge Function: sends Web Push study reminders.
// Called every 15 minutes by pg_cron (see supabase/cron.sql).
// Secrets required:  VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com), APP_URL
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { shouldSend, type Target } from './schedule.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);
const APP_URL = Deno.env.get('APP_URL') ?? '/';

Deno.serve(async () => {
  const now = new Date();
  const { data, error } = await supabase.rpc('reminder_targets');
  if (error) return new Response(error.message, { status: 500 });

  let sent = 0, removed = 0;
  for (const t of data as Target[]) {
    try {
      const msg = shouldSend(t, now);
      if (!msg) continue;

      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', t.user_id);
      const payload = JSON.stringify({ ...msg, url: APP_URL + msg.url, badge: t.due_count });
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id);
            removed++;
          } else console.error('push failed', code, (e as Error).message);
        }
      }
      await supabase.from('user_settings').update({ last_push_at: now.toISOString() }).eq('user_id', t.user_id);
    } catch (e) {
      console.error('target failed', t.user_id, (e as Error).message);
    }
  }
  return Response.json({ checked: data.length, sent, removed });
});
