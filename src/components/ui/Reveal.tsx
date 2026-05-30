"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

/**
 * Lightweight entrance animation. Fades + lifts content into view once.
 * Use `RevealGroup` as a parent to stagger a set of `Reveal` children.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
} & HTMLMotionProps<"div">) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers the entrance of its `RevealItem` children. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
  delayChildren = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child. Must live inside a `RevealGroup`. */
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
