type IconProps = { className?: string };

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconChat({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M5.5 6.5h13v9.2H10.4L6 19.2v-3.5H5.5z" />
    </svg>
  );
}

export function IconDiary({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect {...stroke} x="6" y="5" width="12" height="14.5" rx="1.2" />
      <path {...stroke} d="M9 5v14.5M10.8 9.2h5.2M10.8 12.4h5.2" />
    </svg>
  );
}

export function IconInsight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M5 16.5 9.2 11l3.1 3.4L19 8" />
      <path {...stroke} d="M14.5 8H19v4.4" />
    </svg>
  );
}

export function IconMe({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle {...stroke} cx="12" cy="9" r="3.1" />
      <path {...stroke} d="M6.6 18.4c.9-2.6 2.8-4 5.4-4s4.5 1.4 5.4 4" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}
