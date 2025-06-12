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

  return (
    <Badge
      {...props}
      className={cn("text-xs font-medium", className)}
      style={{ backgroundColor: display.color }}
      data-work-type={workType}
    >
      {display.label}
    </Badge>
  );
}
