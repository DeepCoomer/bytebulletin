import { AppShell } from '@/components/AppShell';
import { getDigests, type DigestJson } from '@/lib/data';

// Revalidate hourly; the pipeline writes once a day.
export const revalidate = 3600;

async function loadDigests(): Promise<DigestJson[]> {
  try {
    return await getDigests();
  } catch (err) {
    // Renders the empty state instead of failing the build/page when the DB is
    // unreachable (e.g. CI builds without secrets).
    console.error('feed load failed:', err);
    return [];
  }
}

export default async function HomePage() {
  const digests = await loadDigests();
  return <AppShell initialDigests={digests} />;
}
