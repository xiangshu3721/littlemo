import { InkSeal } from "./InkIcons";

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-10 text-center">
      <InkSeal className="mb-5 h-14 w-14 text-ink-faint/80" />
      <p className="font-display text-[22px] font-medium tracking-[0.04em] text-ink">{title}</p>
      <p className="mt-3 max-w-[17rem] text-[14px] leading-7 text-ink-soft">{body}</p>
    </div>
  );
}
