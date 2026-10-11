// Web Push registration. Reminders themselves are sent by the Supabase Edge Function (see supabase/).
import { getClient, currentUser } from './sync.js';

const vapid = () => (window.FRENCH_DRILL_CONFIG || {}).VAPID_PUBLIC_KEY;

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const pushReady = () => pushSupported() && !!vapid() && !!getClient();
export const permission = () => (pushSupported() ? Notification.permission : 'unsupported');

const b64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function enablePush() {
  if (!pushReady()) throw new Error('Push needs Supabase + a VAPID key configured (see README).');
  const user = currentUser();
  if (!user) throw new Error('Sign in first so reminders can be sent to your account.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were blocked. Allow them in your browser/site settings.');
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapid()) }));
  const j = sub.toJSON();
  const { error } = await getClient().from('push_subscriptions').upsert(
    { user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;
  return true;
}

export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await getClient()?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function isSubscribed() {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  return !!(await reg.pushManager.getSubscription());
}

export function setBadge(n) {
  try {
    if (n > 0) navigator.setAppBadge?.(n);
    else navigator.clearAppBadge?.();
  } catch {
    /* unsupported */
  }
}
