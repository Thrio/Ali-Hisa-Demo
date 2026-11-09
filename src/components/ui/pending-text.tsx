import type { ElementType } from "react";
import { cn } from "@/lib/utils";

type PendingTextProps = {
  lines: number;
  as?: ElementType;
  label?: string;
  className?: string;
};

export function PendingText({ lines, as: Tag = "span", label, className }: PendingTextProps) {
  const text = label ?? `[[PENDING: copy — ${lines} line(s)]]`;
  return (
    <Tag
      className={cn("block italic text-[var(--color-on-surface-muted)]", className)}
      style={{ minHeight: `calc(${lines} * 1lh)` }}
    >
      {text}
    </Tag>
  );
}
