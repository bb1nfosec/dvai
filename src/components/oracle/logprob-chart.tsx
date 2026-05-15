'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface LogprobDataPoint {
  token: string;
  avgLogprob: number;
  count: number;
}

interface LogprobChartProps {
  data: LogprobDataPoint[];
}

export function LogprobChart({ data }: LogprobChartProps) {
  // Take top 20 for display
  const chartData = data.slice(0, 20).map(d => ({
    ...d,
    displayToken: d.token.length > 8 ? d.token.slice(0, 6) + '..' : d.token,
    prob: Math.exp(d.avgLogprob),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="displayToken"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            angle={-45}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'prob') return [value.toFixed(4), 'Avg Probability'];
              if (name === 'count') return [value, 'Occurrences'];
              return [value, name];
            }}
            labelFormatter={(label: string) => {
              const item = chartData.find(d => d.displayToken === label);
              return item ? `Token: "${item.token}"` : label;
            }}
          />
          <Bar dataKey="prob" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => {
              const isHigh = entry.prob > 0.3;
              const isMid = entry.prob > 0.05;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isHigh ? '#22c55e' : isMid ? '#f59e0b' : '#ef4444'}
                  fillOpacity={0.7}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
