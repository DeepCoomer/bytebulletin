import webpush from 'web-push';
import { getPushSubscriptionsCollection, type WorkerEnv } from '@bytebulletin/shared';
import type { Logger } from 'pino';

export interface RunNotification {
  stored: number;
  /** Highest-scored stored items, best first — up to 3 titles shown in the body. */
  topItems: Array<{ title: string; dedupHash: string }>;
}

/**
 * One push per owner device per run: count + highest-scored headline.
 * Silent when nothing was stored, VAPID keys are absent, or no device has
 * subscribed. Dead subscriptions (404/410) are pruned as we go.
 */
export async function sendRunNotification(
  env: WorkerEnv,
  log: Logger,
  { stored, topItems }: RunNotification,
): Promise<void> {
  if (stored === 0) return;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    log.info('push skipped — VAPID keys not configured');
    return;
  }
  const subscriptions = await getPushSubscriptionsCollection(env.MONGODB_URI);
  const subs = await subscriptions.find({}).toArray();
  if (subs.length === 0) return;

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const top3 = topItems.slice(0, 3);
  const body =
    top3.map((t) => `• ${t.title.length > 72 ? `${t.title.slice(0, 71)}…` : t.title}`).join('\n') ||
    'Fresh engineering news is ready.';
  // Tapping the notification opens straight to the single highest-scored
  // article — the other stored items are one tap away in the feed itself.
  const url = top3[0] ? `/?open=${top3[0].dedupHash}` : '/';
  const payload = JSON.stringify({
    title: `ByteBulletin: ${stored} new digest${stored === 1 ? '' : 's'}`,
    body,
    url,
  });

  let sent = 0;
  let pruned = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await subscriptions.deleteOne({ endpoint: sub.endpoint });
        pruned++;
      } else {
        log.warn({ err: String(err) }, 'push send failed');
      }
    }
  }
  log.info({ sent, pruned }, 'push notifications sent');
}
