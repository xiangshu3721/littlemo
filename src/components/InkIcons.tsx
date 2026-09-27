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

export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M12 6.5v11M6.5 12h11" />
    </svg>
  );
}

export function IconSend({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M5.4 12 18.6 5.6 12.8 18.4l-1.4-5.6z" />
    </svg>
  );
}

export function IconMic({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect {...stroke} x="9" y="4.6" width="6" height="9.6" rx="3" />
      <path {...stroke} d="M7.2 11.4a4.8 4.8 0 0 0 9.6 0M12 16.2V19" />
    </svg>
  );
}

export function IconImage({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect {...stroke} x="5" y="6.2" width="14" height="11.6" rx="1.6" />
      <circle {...stroke} cx="9.2" cy="10.2" r="1.2" />
      <path {...stroke} d="m8.4 15.4 3.2-3.2 2.2 2.2 2.1-2.4 2.1 3.4" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M8 7.2h8M9.4 7.2V6.2A1.2 1.2 0 0 1 10.6 5h2.8a1.2 1.2 0 0 1 1.2 1.2v1M8.6 9.2l.6 8.2h5.6l.6-8.2" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle {...stroke} cx="12" cy="12" r="2.2" />
      <path {...stroke} d="M12 5.4v1.8M12 16.8v1.8M5.4 12h1.8M16.8 12h1.8M7.3 7.3l1.3 1.3M15.4 15.4l1.3 1.3M16.7 7.3l-1.3 1.3M8.6 15.4l-1.3 1.3" />
    </svg>
  );
}

export function IconCaret({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="m8 10 4 4 4-4" />
    </svg>
  );
}

export function IconSun({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle {...stroke} cx="12" cy="12" r="3.2" />
      <path {...stroke} d="M12 5.2v1.4M12 17.4v1.4M5.2 12h1.4M17.4 12h1.4M7.2 7.2l1 1M15.8 15.8l1 1M16.8 7.2l-1 1M8.2 15.8l-1 1" />
    </svg>
  );
}

export function IconMoon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M14.6 6.4A6.4 6.4 0 0 0 8.2 16.6 6.6 6.6 0 1 1 14.6 6.4z" />
    </svg>
  );
}

export function IconTime({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle {...stroke} cx="12" cy="12" r="7" />
      <path {...stroke} d="M12 8.4V12l2.6 1.8" />
    </svg>
  );
}

export function IconSprig({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M12 19.2c0-6.4 1.4-10.2 6.2-13.4" />
      <path {...stroke} d="M12.4 10.2c-2.2-1.8-4.8-2.4-7.4-2.2 2.4 2.2 3.8 4.6 4.2 7.6" />
      <path {...stroke} d="M12.6 13.6c1.6-1.2 3.6-1.6 5.4-1.4-1.6 1.6-2.6 3.4-2.8 5.4" />
    </svg>
  );
}

export function IconLotus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M12 18.2c-2.8-2-4.8-4.6-5.6-7.8 2.4.4 4.4 1.6 5.6 3.6 1.2-2 3.2-3.2 5.6-3.6-.8 3.2-2.8 5.8-5.6 7.8z" />
      <path {...stroke} d="M12 13.2c-1.6-2.6-1.8-5.2-1-7.6 1.4 1.2 2.2 3.2 2.2 5.2 0-2 .8-4 2.2-5.2.8 2.4.6 5-1 7.6" />
    </svg>
  );
}

export function InkSeal({ className }: IconProps) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      <circle cx="36" cy="36" r="28" fill="none" stroke="currentColor" strokeWidth="1.15" />
      <circle cx="36" cy="36" r="22.5" fill="none" stroke="currentColor" strokeWidth="0.55" opacity="0.55" />
      <path
        d="M36 22.5v27M27.5 29.5c4.4 1.8 8.6 1.8 17 0M27.5 42.5c4.4-1.6 8.6-1.6 17 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}
