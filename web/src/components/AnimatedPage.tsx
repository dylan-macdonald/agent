import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 8,
    },
    animate: {
        opacity: 1,
        y: 0,
    },
    exit: {
        opacity: 0,
        y: -8,
    },
};

const pageTransition = {
    type: 'tween',
    ease: 'easeOut',
    duration: 0.2,
};

export function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Staggered children animation
const containerVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    initial: { opacity: 0, y: 12 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { type: 'tween', ease: 'easeOut', duration: 0.3 },
    },
};

interface AnimatedListProps {
    children: ReactNode;
    className?: string;
}

export function AnimatedList({ children, className = '' }: AnimatedListProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function AnimatedItem({ children, className = '' }: AnimatedListProps) {
    return (
        <motion.div variants={itemVariants} className={className}>
            {children}
        </motion.div>
    );
}

// Fade in animation for cards
export function FadeIn({ children, delay = 0, className = '' }: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Scale up animation for interactive elements
export function ScaleOnHover({ children, className = '' }: AnimatedListProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// Number counter animation
export function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={value}
        >
            {value}
        </motion.span>
    );
}
