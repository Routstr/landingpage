export function RoutstrMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12.5 3h7c5 0 9 4 9 9v8c0 5-4 9-9 9h-7c-5 0-9-4-9-9v-8c0-5 4-9 9-9z
           M12.5 5.8h7c3.4 0 6.2 2.8 6.2 6.2v8c0 3.4-2.8 6.2-6.2 6.2h-7c-3.4 0-6.2-2.8-6.2-6.2v-8c0-3.4 2.8-6.2 6.2-6.2z"
      />
      <g transform="rotate(112 16 16)">
        <rect x="8.7" y="13.85" width="14.6" height="4.3" rx="2.15" />
      </g>
    </svg>
  );
}
