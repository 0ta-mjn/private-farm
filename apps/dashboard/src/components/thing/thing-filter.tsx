import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/select";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@repo/api";
import { useQuery } from "@tanstack/react-query";

export type ThingFilterValue = Pick<
  RouterOutputs["thing"]["list"][number],
  "id" | "name"
> | null;

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
  const trpc = useTRPC();
  const { data: things, isLoading } = useQuery(
    trpc.thing.list.queryOptions(
      { organizationId },
      { enabled: !!organizationId }
    )
  );

  return (
    <Select
      onValueChange={(v) => {
        const selectedThing = things?.find((thing) => thing.id === v) || null;
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
          things?.map((thing) => (
            <SelectItem key={thing.id} value={thing.id}>
              {thing.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
