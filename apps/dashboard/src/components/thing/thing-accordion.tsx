"use client";

import { Button } from "@/shadcn/button";
import { Card, CardContent } from "@/shadcn/card";
import { getThingTypeDisplay } from "@/constants/agricultural-constants";
import { Delete, Edit, MapPin, Ruler } from "lucide-react";
import { RouterOutputs } from "@repo/api";

type ThingItem = RouterOutputs["thing"]["list"][number];

interface ThingAccordionItemProps {
  field: ThingItem;
  onEdit: (v: ThingItem) => void;
  onDelete: (id: string) => void;
}

// TODO センサー設定が追加されたらアコーディオン化
export function ThingAccordionItem({
  field,
  onDelete,
  onEdit,
}: ThingAccordionItemProps) {
  return (
    <li value={field.id} className="border rounded-lg">
      <Card className="border-none">
        <div className="hover:no-underline px-6 py-4">
          <div className="flex items-center justify-between w-full mr-4">
            <div className="flex items-center gap-4">
              <div className="text-left">
                <h3 className="font-semibold text-lg">{field.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {getThingTypeDisplay(field.type)?.label}
                  </span>
                  {field.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {field.location}
                    </div>
                  )}
                  {field.area && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Ruler className="h-3 w-3" />
                      {field.area}㎡
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4">
          <CardContent className="p-0 space-y-4">
            {field.description && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  説明
                </h4>
                <p className="text-sm">{field.description}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(field.id)}
                className="flex items-center gap-2"
              >
                <Delete className="h-3 w-3" />
                削除
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(field)}
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
