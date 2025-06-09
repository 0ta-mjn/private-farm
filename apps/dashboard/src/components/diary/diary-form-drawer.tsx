"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/shadcn/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shadcn/form";
import { Input } from "@/shadcn/input";
import { Textarea } from "@/shadcn/textarea";
import { Button } from "@/shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shadcn/popover";
import { Calendar } from "@/shadcn/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/select";
import { Badge } from "@/shadcn/badge";
import { Checkbox } from "@/shadcn/checkbox";
import { Label } from "@/shadcn/label";
import { cn } from "@/lib/utils";
import {
  WEATHER_DISPLAY_OPTIONS,
  WORK_TYPE_DISPLAY_OPTIONS,
} from "@/constants/agricultural-constants";

// フォームスキーマ定義
const DiaryFormSchema = z.object({
  date: z.date({
    required_error: "作業日を選択してください",
  }),
  title: z.string().optional(),
  content: z.string().optional(),
  workType: z.string().min(1, "作業種別を選択してください"),
  weather: z.string().optional(),
  temperature: z.number().optional(),
  thingIds: z.array(z.string()),
});

type DiaryFormData = z.infer<typeof DiaryFormSchema>;

interface FieldOption {
  id: string;
  name: string;
  type: string;
  area: number;
}

export type { DiaryFormData, FieldOption };

interface DiaryFormDrawerProps {
  open: boolean;
  onClose: () => void;
  isEdit?: boolean;
  isSubmitting?: boolean;
  initialData?: DiaryFormData;
  onSubmit: (data: DiaryFormData) => void;
  fieldOptions?: FieldOption[];
}

export function DiaryFormDrawer({
  open,
  onClose,
  isEdit = false,
  isSubmitting = false,
  initialData,
  onSubmit,
  fieldOptions = [],
}: DiaryFormDrawerProps) {
  const form = useForm<DiaryFormData>({
    resolver: zodResolver(DiaryFormSchema),
    defaultValues: {
      date: new Date(),
      title: "",
      content: "",
      workType: "",
      weather: "",
      temperature: undefined,
      thingIds: [],
    },
  });

  // 初期データでフォームを設定
  useEffect(() => {
    if (initialData) {
      form.reset({
        date: initialData.date,
        title: initialData.title || "",
        content: initialData.content || "",
        workType: initialData.workType,
        weather: initialData.weather || "",
        temperature: initialData.temperature || undefined,
        thingIds: initialData.thingIds,
      });
    } else {
      // 新規作成モードの場合、フォームをリセット
      form.reset({
        date: new Date(),
        title: "",
        content: "",
        workType: "",
        weather: "",
        temperature: undefined,
        thingIds: [],
      });
    }
  }, [initialData, form]);

  const selectedThingIds = form.watch("thingIds") ?? [];

  const handleSubmit = (data: DiaryFormData) => {
    onSubmit(data);
  };

  const handleFieldToggle = (fieldId: string) => {
    const currentIds = form.getValues("thingIds") ?? [];
    const updatedIds = currentIds.includes(fieldId)
      ? currentIds.filter((id) => id !== fieldId)
      : [...currentIds, fieldId];

    form.setValue("thingIds", updatedIds);
  };

  const selectedFields = fieldOptions.filter((field) =>
    selectedThingIds.includes(field.id)
  );

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent data-testid="diary-form-drawer">
        <DrawerHeader className="text-left border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center justify-between lg:justify-start">
              <div>
                <DrawerTitle data-testid="drawer-title">
                  {isEdit ? "農業日誌を編集" : "農業日誌を作成"}
                </DrawerTitle>
                <DrawerDescription data-testid="drawer-description">
                  作業内容や対象ほ場の情報を記録してください。
                </DrawerDescription>
              </div>
            </div>

            {/* 大きい画面でのアクションボタン */}
            <div className="hidden lg:flex gap-2" data-testid="desktop-actions">
              <Button
                data-testid="submit-button-desktop"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
              </Button>
              <Button
                data-testid="cancel-button-desktop"
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 p-4 overflow-y-auto">
          <Form {...form}>
            <form
              data-testid="diary-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* レスポンシブレイアウト */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左カラム */}
                <div className="space-y-6">
                  {/* 作業種別 */}
                  <FormField
                    control={form.control}
                    name="workType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          作業種別 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="work-type-select">
                              <SelectValue placeholder="作業種別を選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="work-type-options">
                            {WORK_TYPE_DISPLAY_OPTIONS.map((workType) => (
                              <SelectItem
                                key={workType.value}
                                value={workType.value}
                                data-testid={`work-type-option-${workType.value}`}
                              >
                                {workType.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage data-testid="work-type-error" />
                      </FormItem>
                    )}
                  />

                  {/* 作業日 */}
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          作業日 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                data-testid="date-picker-trigger"
                                variant="outline"
                                className={cn(
                                  "w-[12.5rem] pl-3 text-left font-normal hover:bg-transparent hover:text-foreground",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", {
                                    locale: ja,
                                  })
                                ) : (
                                  <span>日付を選択</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              data-testid="date-picker-calendar"
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                              autoFocus
                              locale={ja}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage data-testid="date-error" />
                      </FormItem>
                    )}
                  />

                  {/* 対象ほ場選択（スタブ実装） */}
                  <FormField
                    control={form.control}
                    name="thingIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>対象ほ場</FormLabel>
                        <FormDescription>
                          作業を行ったほ場や温室を選択してください（複数選択可）
                        </FormDescription>
                        {selectedFields.length > 0 && (
                          <div
                            className="flex flex-wrap gap-2 mb-3"
                            data-testid="selected-fields-badges"
                          >
                            {selectedFields.map((field) => (
                              <Badge
                                key={field.id}
                                variant="secondary"
                                data-testid={`field-badge-${field.id}`}
                              >
                                {field.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div
                          className="grid grid-cols-1 gap-3"
                          data-testid="field-options-container"
                        >
                          {fieldOptions.map((field) => (
                            <Label
                              key={field.id}
                              className={cn(
                                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                                selectedThingIds.includes(field.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                              data-testid={`field-option-${field.id}`}
                            >
                              <Checkbox
                                id={`field-${field.id}`}
                                checked={selectedThingIds.includes(field.id)}
                                onCheckedChange={() =>
                                  handleFieldToggle(field.id)
                                }
                                className="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                data-testid={`field-checkbox-${field.id}`}
                              />
                              <div className="grid gap-1.5 font-normal">
                                <p className="text-sm leading-none font-medium">
                                  {field.name}
                                </p>
                                <p className="text-muted-foreground text-sm">
                                  {field.type === "field" ? "ほ場" : "温室"} •{" "}
                                  {field.area}㎡
                                </p>
                              </div>
                            </Label>
                          ))}
                        </div>
                        <FormMessage data-testid="fields-error" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 右カラム */}
                <div className="space-y-6">
                  {/* 天気と気温（固定で横並び） */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* 天気 */}
                    <FormField
                      control={form.control}
                      name="weather"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>天気</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="weather-select">
                                <SelectValue placeholder="天気を選択" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent data-testid="weather-options">
                              {WEATHER_DISPLAY_OPTIONS.map((weather) => (
                                <SelectItem
                                  key={weather.value}
                                  value={weather.value}
                                  data-testid={`weather-option-${weather.value}`}
                                >
                                  {weather.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage data-testid="weather-error" />
                        </FormItem>
                      )}
                    />

                    {/* 気温 */}
                    <FormField
                      control={form.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>気温 (℃)</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="temperature-input"
                              type="number"
                              placeholder="例: 25"
                              className="max-w-[6.25rem]"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                  value === "" ? undefined : Number(value)
                                );
                              }}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage data-testid="temperature-error" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 作業メモ */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>作業メモ</FormLabel>
                        <FormControl>
                          <Textarea
                            data-testid="content-textarea"
                            placeholder="作業の詳細や気づいたことを記録してください（任意）"
                            className="min-h-[7.5rem] lg:min-h-[12rem] max-w-full resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage data-testid="content-error" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* モバイル用のフッターボタン */}
        <div className="p-4 border-t lg:hidden" data-testid="mobile-actions">
          <div className="flex flex-col gap-2 w-full">
            <Button
              data-testid="submit-button-mobile"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
            </Button>
            <Button
              data-testid="cancel-button-mobile"
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
