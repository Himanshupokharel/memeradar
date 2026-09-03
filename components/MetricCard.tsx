export function MetricCard({ label, value, note, tone = 'neutral' }: { label: string; value: string; note: string; tone?: 'neutral' | 'up' | 'warn' }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small className={tone}>{note}</small></article>;
}
