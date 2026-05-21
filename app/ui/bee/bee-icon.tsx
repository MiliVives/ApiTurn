import type { CSSProperties } from 'react';

export function BeeIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2C10.5 2 9.5 3 9.5 4.5C9.5 5.5 10 6.5 11 7L10 8H8C6.5 8 5 9.5 5 11C5 12.5 6.5 14 8 14H10L11 15C10 15.5 9.5 16.5 9.5 17.5C9.5 19 10.5 20 12 20C13.5 20 14.5 19 14.5 17.5C14.5 16.5 14 15.5 13 15L14 14H16C17.5 14 19 12.5 19 11C19 9.5 17.5 8 16 8H14L13 7C14 6.5 14.5 5.5 14.5 4.5C14.5 3 13.5 2 12 2Z"
        fill="currentColor"
      />
      <circle cx="10" cy="11" r="1" fill="white" />
      <circle cx="14" cy="11" r="1" fill="white" />
      <path
        d="M8 10L6 9M16 10L18 9M8 12L6 13M16 12L18 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
