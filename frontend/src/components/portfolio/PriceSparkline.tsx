import type { PriceSnapshot } from '../../types/portfolio';

interface Props {
  snapshots: PriceSnapshot[];
}

export function PriceSparkline({ snapshots }: Props) {
  if (snapshots.length < 2) return null;

  const values = snapshots.map(s => s.bid);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 64;
  const H = 24;
  const step = W / (values.length - 1);

  const points = values
    .map((v, i) => `${i * step},${H - ((v - min) / range) * H}`)
    .join(' ');

  const up = values[values.length - 1] <= values[0]; // price going down = profit for short puts
  const color = up ? '#34d399' : '#f87171'; // emerald if profitable (price fell), red if not

  return (
    <svg width={W} height={H} className="inline-block" style={{ verticalAlign: 'middle' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
