"use client";

import { Button } from "@/shadcn/button";
import { Card, CardContent } from "@/shadcn/card";
import { Delete, Edit, MapPin, Ruler } from "lucide-react";
import { ThingTypeChip } from "@/components/thing/thing-type-chip";
import { client } from "@/rpc/client";

type ThingItem = Awaited<
  ReturnType<(typeof client.thing.list)[":organizationId"]["$get"]>
>[number];

interface ThingAccordionItemProps {
  thing: ThingItem;
  onEdit: (v: ThingItem) => void;
  onDelete: (id: string) => void;
}

// TODO センサー設定が追加されたらアコーディオン化
export function ThingAccordionItem({
  thing,
  onDelete,
  onEdit,
}: ThingAccordionItemProps) {
  return (
    <li value={thing.id} className="border rounded-lg">
      <Card className="border-none">
        <div className="hover:no-underline px-6 py-4">
          <div className="flex items-center justify-between w-full mr-4">
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h3 className="font-semibold text-lg">{thing.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <ThingTypeChip thingType={thing.type} />

                  {thing.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {thing.location}
                    </div>
                  )}
                  {thing.area && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Ruler className="h-3 w-3" />
                      {thing.area}㎡
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4">
          <CardContent className="p-0 space-y-4">
            {thing.description && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  説明
                </h4>
                <p className="text-sm">{thing.description}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(thing.id)}
                className="flex items-center gap-2"
              >
                <Delete className="h-3 w-3" />
                削除
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(thing)}
                className="flex items-center gap-2"
              >
                <Edit className="h-3 w-3" />
                編集
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </li>
  );
}
