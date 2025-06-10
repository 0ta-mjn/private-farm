import { getThingTypeDisplay } from "@/constants/agricultural-constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/shadcn/badge";

type ThingTypeChipProps = {
  thingType?: string | null;
  className?: string;
};
export function ThingTypeChip({ thingType, className }: ThingTypeChipProps) {
  const display = getThingTypeDisplay(thingType);

  if (!display) return null;

  return (
    <Badge
      className={cn("text-xs font-medium", className)}
      style={{ backgroundColor: display.color }}
    >
      {display.label}
    </Badge>
  );
}
