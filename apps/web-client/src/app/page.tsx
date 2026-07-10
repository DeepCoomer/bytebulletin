import { Feed } from '@/components/Feed';
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
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">ByteBulletin</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          High-signal engineering news, distilled daily.
        </p>
      </header>
      <Feed initialDigests={digests} />
    </main>
  );
}
