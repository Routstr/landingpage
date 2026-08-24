import {
  ROUTSTR_MARK_BAR_PATH,
  ROUTSTR_MARK_BAR_ROTATION,
  ROUTSTR_MARK_PATH,
} from "@/lib/brand";

export function RoutstrMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d={ROUTSTR_MARK_PATH} />
      <g transform={`rotate(${ROUTSTR_MARK_BAR_ROTATION} 16 16)`}>
        <path d={ROUTSTR_MARK_BAR_PATH} />
      </g>
    </svg>
  );
}
