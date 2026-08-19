'use client';

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ChartDatum {
  catalog_key: string;
  list_count: number;
  ticket_count: number;
  app_group_count: number;
}

/**
 * Drop only the leading org id, which is identical across most keys, and keep
 * country + segment + tail -- enough to tell two catalogs apart on the axis.
 */
function shortLabel(key: string): string {
  const dash = key.indexOf('-');
  return dash > 0 ? key.slice(dash + 1) : key;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="key-text mb-1 font-medium text-popover-foreground">{d.catalog_key}</p>
      <p className="text-muted-foreground">
        In <span className="font-medium text-foreground">{d.list_count}</span> list(s) ·{' '}
        <span className="font-medium text-foreground">{d.ticket_count}</span> ticket(s)
      </p>
      {d.app_group_count > 0 && (
        <p className="text-muted-foreground">{d.app_group_count} app group(s) beneath it</p>
      )}
    </div>
  );
}

/**
 * Single-series magnitude ranking: one hue for every bar, since color here
 * carries no identity beyond "this is the measure". Values are labelled
 * directly, so no legend and no value axis are needed.
 */
export function RepeatsChart({ data }: { data: ChartDatum[] }) {
  // A zero-length bar carries no information on a "by number of lists" chart.
  const top = data.filter((d) => d.list_count > 0).slice(0, 15);
  if (top.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No catalog appears in a list yet — create a list to see repeats here.
      </p>
    );
  }

  return (
    <div style={{ height: Math.max(200, top.length * 32 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
          {/* No grid: the value axis is hidden and every bar is directly labelled. */}
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="catalog_key"
            width={170}
            tickFormatter={shortLabel}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.5 }} />
          <Bar dataKey="list_count" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
            {top.map((d) => (
              <Cell key={d.catalog_key} fill="hsl(var(--chart-1))" />
            ))}
            <LabelList
              dataKey="list_count"
              position="right"
              className="fill-foreground"
              style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
