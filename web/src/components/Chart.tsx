import { useMemo } from 'react';

interface DataPoint {
    label: string;
    value: number;
}

interface BarChartProps {
    data: DataPoint[];
    height?: number;
    color?: string;
    emptyMessage?: string;
}

export function BarChart({ data, height = 120, color = '#3b82f6', emptyMessage = 'No data' }: BarChartProps) {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-zinc-500 text-sm" style={{ height }}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="w-full" style={{ height }}>
            <div className="flex items-end justify-between h-full gap-1">
                {data.map((point, i) => {
                    const barHeight = (point.value / maxValue) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                                style={{
                                    height: `${barHeight}%`,
                                    backgroundColor: color,
                                    minHeight: point.value > 0 ? '4px' : '0',
                                }}
                                title={`${point.label}: ${point.value}`}
                            />
                            <span className="text-[10px] text-zinc-500 truncate w-full text-center">
                                {point.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface LineChartProps {
    data: DataPoint[];
    height?: number;
    color?: string;
    showDots?: boolean;
    emptyMessage?: string;
}

export function LineChart({ data, height = 120, color = '#3b82f6', showDots = true, emptyMessage = 'No data' }: LineChartProps) {
    const { points, maxValue, minValue } = useMemo(() => {
        if (data.length === 0) return { points: '', maxValue: 0, minValue: 0 };

        const values = data.map(d => d.value);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const range = max - min || 1;

        const width = 100;
        const chartHeight = height - 30; // Leave room for labels

        const pts = data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * width;
            const y = chartHeight - ((d.value - min) / range) * (chartHeight - 10);
            return `${x},${y}`;
        }).join(' ');

        return { points: pts, maxValue: max, minValue: min };
    }, [data, height]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center text-zinc-500 text-sm" style={{ height }}>
                {emptyMessage}
            </div>
        );
    }

    const chartHeight = height - 30;

    return (
        <div className="w-full" style={{ height }}>
            <svg viewBox={`0 0 100 ${chartHeight}`} className="w-full" style={{ height: chartHeight }} preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="0" x2="100" y2="0" stroke="#27272a" strokeWidth="0.5" />
                <line x1="0" y1={chartHeight / 2} x2="100" y2={chartHeight / 2} stroke="#27272a" strokeWidth="0.5" />
                <line x1="0" y1={chartHeight} x2="100" y2={chartHeight} stroke="#27272a" strokeWidth="0.5" />

                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Dots */}
                {showDots && data.map((d, i) => {
                    const x = (i / (data.length - 1 || 1)) * 100;
                    const range = maxValue - minValue || 1;
                    const y = chartHeight - ((d.value - minValue) / range) * (chartHeight - 10);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="2"
                            fill={color}
                            className="hover:r-3 transition-all"
                        >
                            <title>{`${d.label}: ${d.value}`}</title>
                        </circle>
                    );
                })}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between mt-1">
                {data.length <= 7 ? (
                    data.map((d, i) => (
                        <span key={i} className="text-[10px] text-zinc-500">{d.label}</span>
                    ))
                ) : (
                    <>
                        <span className="text-[10px] text-zinc-500">{data[0]?.label}</span>
                        <span className="text-[10px] text-zinc-500">{data[data.length - 1]?.label}</span>
                    </>
                )}
            </div>
        </div>
    );
}

interface ProgressRingProps {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
}

export function ProgressRing({ value, max, size = 80, strokeWidth = 8, color = '#3b82f6', label }: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min(value / max, 1);
    const offset = circumference - progress * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#27272a"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold">{Math.round(progress * 100)}%</span>
                {label && <span className="text-[10px] text-zinc-500">{label}</span>}
            </div>
        </div>
    );
}
