"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/shadcn/tabs";
import { CalendarIcon, GridIcon } from "lucide-react";

type ViewMode = "calendar" | "list";

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <Tabs
      value={viewMode}
      onValueChange={(value) => onViewModeChange(value as ViewMode)}
    >
      <TabsList>
        <TabsTrigger value="calendar" className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          カレンダー
        </TabsTrigger>
        <TabsTrigger value="list" className="flex items-center gap-2">
          <GridIcon className="h-4 w-4" />
          一覧
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
