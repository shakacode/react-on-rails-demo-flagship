'use client';

import * as styles from './SlowStatsPanel.module.css';

export type SlowStats = {
  renderedAt: string;
  delayMs: number;
  totals: { open: number; doing: number; done: number };
};

// A client component whose CSS is an extracted client-chunk stylesheet used
// ONLY by this late-revealed boundary. If that stylesheet is not loaded before
// React reveals this HTML, the panel paints unstyled (FOUC) — which is exactly
// what this page exists to make observable.
// The `data-slow-stats-panel` hook lets tests read computed styles to detect it.
export default function SlowStatsPanel({ stats }: { stats: SlowStats }) {
  return (
    <div className={styles.panel} data-slow-stats-panel data-rendered-at={stats.renderedAt}>
      <h2 className={styles.heading}>Stats loaded after {stats.delayMs}ms</h2>
      <dl className={styles.grid}>
        <div className={styles.cell}>
          <dt>Open</dt>
          <dd>{stats.totals.open}</dd>
        </div>
        <div className={styles.cell}>
          <dt>Doing</dt>
          <dd>{stats.totals.doing}</dd>
        </div>
        <div className={styles.cell}>
          <dt>Done</dt>
          <dd>{stats.totals.done}</dd>
        </div>
      </dl>
      <p className={styles.timestamp}>Server rendered at {stats.renderedAt}</p>
    </div>
  );
}
