import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/select";
import { useQuery } from "@tanstack/react-query";
import { things } from "@/rpc/factory";

export type ThingFilterValue = {
  id: string;
  name: string;
} | null;

interface ThingFilterProps {
  organizationId: string;
  value?: ThingFilterValue | null;
  onChange?: (value: ThingFilterValue | null) => void;
  size?: "sm" | "default";
  contentRef?: React.Ref<HTMLDivElement>;
}

const ALL_VALUE = "all";

export function ThingFilter({
  organizationId,
  value = null,
  onChange,
  size,
  contentRef,
}: ThingFilterProps) {
  const { data: thingsData, isLoading } = useQuery(things.list(organizationId));

  return (
    <Select
      onValueChange={(v) => {
        const selectedThing =
          thingsData?.find((thing) => thing.id === v) || null;
        onChange?.(selectedThing);
      }}
      value={value?.id || ALL_VALUE}
      disabled={isLoading}
      defaultValue={ALL_VALUE}
    >
      <SelectTrigger className="w-48" size={size}>
        <SelectValue placeholder="区画" />
      </SelectTrigger>
      <SelectContent ref={contentRef}>
        <SelectItem value={ALL_VALUE}>すべての区画</SelectItem>

        {isLoading ? (
          <SelectItem value={ALL_VALUE} disabled>
            読み込み中...
          </SelectItem>
        ) : (
          thingsData?.map((thing) => (
            <SelectItem key={thing.id} value={thing.id}>
              {thing.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
