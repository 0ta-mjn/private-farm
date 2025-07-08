import { WORK_TYPE_DISPLAY_OPTIONS } from "@/constants/agricultural-constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/select";

interface ThingFilterProps {
  value?: string | null;
  onChange?: (value: string | null) => void;
  size?: "sm" | "default";
  contentRef?: React.Ref<HTMLDivElement>;
}

const ALL_VALUE = "all";

export function WorkTypeFilter({
  value = null,
  onChange,
  size,
  contentRef,
}: ThingFilterProps) {
  return (
    <Select
      onValueChange={(value) => {
        if (value === ALL_VALUE) {
          onChange?.(null);
        } else {
          onChange?.(value);
        }
      }}
      value={value || ALL_VALUE}
      defaultValue={ALL_VALUE}
    >
      <SelectTrigger className="w-48" size={size}>
        <SelectValue placeholder="作業種別" />
      </SelectTrigger>
      <SelectContent data-testid="work-type-options" ref={contentRef}>
        <SelectItem value={ALL_VALUE}>すべての作業種別</SelectItem>

        {WORK_TYPE_DISPLAY_OPTIONS.map((workType) => (
          <SelectItem
            key={workType.value}
            value={workType.value}
            data-testid={`work-type-option-${workType.value}`}
          >
            <span>{workType.icon}</span>
            <span>{workType.label}</span>
            <span
              className="inline-block size-2 rounded-full"
              style={{ background: workType.color }}
            ></span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
