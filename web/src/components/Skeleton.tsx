import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-zinc-800/50 rounded ${className}`}
        />
    );
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
    return (
        <div className={`rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5 ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
        </div>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-8 w-12 mb-1" />
                    <Skeleton className="h-3 w-20" />
                </div>
            ))}
        </div>
    );
}

export function SkeletonChart({ height = 100 }: { height?: number }) {
    return (
        <div className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-end justify-between gap-2" style={{ height }}>
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <Skeleton
                            className="w-full rounded-t"
                            style={{ height: `${Math.random() * 60 + 20}%` }}
                        />
                        <Skeleton className="h-2 w-6" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Page-level skeleton
export function DashboardSkeleton() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto space-y-6"
        >
            {/* Welcome card skeleton */}
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-8">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-64 mb-3" />
                <Skeleton className="h-4 w-96 mb-6" />
                <Skeleton className="h-10 w-40 rounded-xl" />
            </div>

            <SkeletonStats />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </motion.div>
    );
}
