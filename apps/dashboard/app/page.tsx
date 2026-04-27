import { redirect } from 'next/navigation';

import { getSessionFromHeaders } from '@/lib/auth/session';

export default async function DashboardHome() {
  const session = await getSessionFromHeaders();

  redirect(session ? '/projects' : '/sign-in');
}
