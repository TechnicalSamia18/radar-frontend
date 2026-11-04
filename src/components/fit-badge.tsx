// The fit tag from the mockup: "82% fit" (colour by level) or "Fit unknown".
import type { Fit } from "@/lib/openings/match";

const LEVEL_STYLE = {
  good: "bg-sunset text-sand",
  fair: "bg-stormy text-beige",
  low: "border border-cloud text-stormy",
} as const;

const LEVEL_WORD = { good: "good", fair: "fair", low: "low" } as const;

export function FitBadge({ fit }: { fit: Fit }) {
  if (fit.kind === "unknown") {
    return (
      <span className="label-caps inline-block whitespace-nowrap border border-stormy px-3 py-1.5 text-stormy" title={fit.reason}>
        Fit unknown
      </span>
    );
  }
  return (
    <span className={`label-caps inline-block whitespace-nowrap px-3 py-1.5 ${LEVEL_STYLE[fit.level]}`}>
      {fit.score}% fit<span className="sr-only"> ({LEVEL_WORD[fit.level]})</span>
    </span>
  );
}
