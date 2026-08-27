import {
  ROUTSTR_MARK_PATH,
  ROUTSTR_MARK_VIEWBOX_MIN,
  ROUTSTR_MARK_VIEWBOX_SIZE,
} from "@/lib/brand";

export function RoutstrMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`${ROUTSTR_MARK_VIEWBOX_MIN} ${ROUTSTR_MARK_VIEWBOX_MIN} ${ROUTSTR_MARK_VIEWBOX_SIZE} ${ROUTSTR_MARK_VIEWBOX_SIZE}`}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={ROUTSTR_MARK_PATH} />
    </svg>
  );
}
