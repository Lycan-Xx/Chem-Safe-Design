interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
}

export default function ConfidenceBadge({
  confidence,
  showLabel = true,
}: ConfidenceBadgeProps) {
  const isConfirmed = confidence >= 0.85;
  const isEstimated = confidence >= 0.5 && confidence < 0.85;

  if (isConfirmed) {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono border border-green-600 text-green-600">
        {showLabel && "Confirmed"}
      </span>
    );
  }

  if (isEstimated) {
    return (
      <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono border border-yellow-600 text-yellow-600">
        {showLabel && "Estimated"}
      </span>
    );
  }

  return (
    <span className="inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono border border-muted-foreground text-muted-foreground">
      {showLabel && "Default applied"}
    </span>
  );
}
