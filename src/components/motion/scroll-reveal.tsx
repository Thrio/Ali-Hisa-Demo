"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { reveal } from "@/lib/motion-tokens";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
};

export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (reduce || !mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reveal.distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: reveal.duration,
        ease: reveal.ease,
      }}
    >
      {children}
    </motion.div>
  );
}
