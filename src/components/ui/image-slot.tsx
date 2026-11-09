import { cn } from "@/lib/utils";

type ImageSlotProps = {
  ratio?: string;
  className?: string;
};

export function ImageSlot({ ratio = "4/3", className }: ImageSlotProps) {
  return (
    <div
      className={cn(
        "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]",
        className,
      )}
      style={{ aspectRatio: ratio }}
      aria-hidden="true"
      data-image-slot
    />
  );
}
