import { getWorkTypeDisplay } from "@/constants/agricultural-constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/shadcn/badge";

type DiaryWorkTypeChipProps = {
  workType?: string | null;
} & React.HTMLAttributes<HTMLDivElement>;
export function DiaryWorkTypeChip({
  workType,
  className,
  ...props
}: DiaryWorkTypeChipProps) {
  const display = getWorkTypeDisplay(workType);
  if (!display) return null;

  const color = display.color;
  return (
    <Badge
      {...props}
      className={cn("text-xs font-medium", className)}
      style={{ backgroundColor: color }}
      data-work-type={workType}
    >
      <span>{display.icon}</span>
      <span className="inline-block min-w-0 truncate">{display.label}</span>
    </Badge>
  );
}
