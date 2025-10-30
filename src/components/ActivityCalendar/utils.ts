import type { CalendarDayCell } from "./types";

const GITHUB_SCALE = [
  { threshold: 0, className: "bg-muted/20 text-muted-foreground" },
  { threshold: 0.15, className: "bg-[#9be9a8] text-foreground" },
  { threshold: 0.35, className: "bg-[#40c463] text-foreground" },
  { threshold: 0.55, className: "bg-[#30a14e] text-foreground" },
  { threshold: 0.75, className: "bg-[#216e39] text-foreground" },
];

export const getCellIntensityClass = (day: CalendarDayCell, maxCount: number): string => {
  if (!day.isCurrentMonth || day.count === 0 || maxCount <= 0) {
    return "bg-muted/10 text-muted-foreground";
  }

  const ratio = day.count / maxCount;
  const match = GITHUB_SCALE.slice()
    .reverse()
    .find((entry) => ratio >= entry.threshold);
  return match ? match.className : GITHUB_SCALE[0].className;
};
