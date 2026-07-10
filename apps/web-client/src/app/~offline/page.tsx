export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-ink-dim">
        This page isn&apos;t cached yet. Reconnect and try again — previously loaded digests stay
        readable offline.
      </p>
    </main>
  );
}
