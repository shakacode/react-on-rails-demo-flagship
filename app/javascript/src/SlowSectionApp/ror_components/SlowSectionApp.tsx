import { Suspense } from 'react';
import SlowStatsPanel, { type SlowStats } from '../components/SlowStatsPanel';

type Props = {
  delayMs: number;
  getReactOnRailsAsyncProp: (name: string) => Promise<SlowStats>;
};

// Awaits the async prop emitted by Rails, so this subtree suspends until the
// slow "query" resolves — after the shell has already streamed.
const SlowStatsSection = async ({ statsPromise }: { statsPromise: Promise<SlowStats> }) => {
  const stats = await statsPromise;
  return <SlowStatsPanel stats={stats} />;
};

const SlowSectionApp = ({ delayMs, getReactOnRailsAsyncProp }: Props) => {
  const statsPromise = getReactOnRailsAsyncProp('slowStats');

  return (
    <section>
      <p>
        Server component shell — streamed in the first flush. The panel below waits {delayMs}
        ms for its data, then streams as HTML.
      </p>
      <Suspense fallback={<div aria-busy="true">Loading stats (server is &ldquo;querying&rdquo;)&hellip;</div>}>
        <SlowStatsSection statsPromise={statsPromise} />
      </Suspense>
    </section>
  );
};

export default SlowSectionApp;
