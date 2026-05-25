import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { syncUser } from '@/app/lib/user-sync';

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 });

  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const body = await req.text();

  let evt: WebhookEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address ?? '';
    const name = `${first_name ?? ''} ${last_name ?? ''}`.trim();
    await syncUser(id, email, name);
  }

  return new Response('OK', { status: 200 });
}
