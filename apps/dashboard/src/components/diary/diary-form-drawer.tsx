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
import { cn } from "@/lib/utils";

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

interface DiaryFormDrawerProps {
  open: boolean;
  onClose: () => void;
  isEdit?: boolean;
  isSubmitting?: boolean;
  initialData?: DiaryFormData;
  onSubmit: (data: DiaryFormData) => void;
}

// スタブデータ：ほ場選択のオプション
const FIELD_OPTIONS = [
  { id: "field-1", name: "A区画（トマト）", type: "field", area: 100 },
  { id: "field-2", name: "B区画（きゅうり）", type: "field", area: 150 },
  { id: "field-3", name: "C区画（ナス）", type: "field", area: 80 },
  { id: "greenhouse-1", name: "第1温室", type: "greenhouse", area: 200 },
  { id: "greenhouse-2", name: "第2温室", type: "greenhouse", area: 180 },
];

const WEATHER_OPTIONS = [
  "晴れ",
  "曇り",
  "雨",
  "雪",
  "晴れ時々曇り",
  "曇り時々雨",
];

const WORK_TYPE_OPTIONS = [
  "種まき",
  "植付け",
  "水やり",
  "除草",
  "施肥",
  "農薬散布",
  "収穫",
  "剪定",
  "その他",
];

export function DiaryFormDrawer({
  open,
  onClose,
  isEdit = false,
  isSubmitting = false,
  initialData,
  onSubmit,
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

  const selectedFields = FIELD_OPTIONS.filter((field) =>
    selectedThingIds.includes(field.id)
  );

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader className="text-left border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center justify-between lg:justify-start">
              <div>
                <DrawerTitle>
                  {isEdit ? "農業日誌を編集" : "農業日誌を作成"}
                </DrawerTitle>
                <DrawerDescription>
                  作業内容や対象ほ場の情報を記録してください。
                </DrawerDescription>
              </div>
            </div>

            {/* 大きい画面でのアクションボタン */}
            <div className="hidden lg:flex gap-2">
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
              </Button>
              <Button
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
                            <SelectTrigger>
                              <SelectValue placeholder="作業種別を選択" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WORK_TYPE_OPTIONS.map((workType) => (
                              <SelectItem key={workType} value={workType}>
                                {workType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                                variant="outline"
                                className={cn(
                                  "w-[12.5rem] pl-3 text-left font-normal hover:bg-transparent hover:text-foreground",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "yyyy年MM月dd日", {
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
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() ||
                                date < new Date("1900-01-01")
                              }
                              initialFocus
                              locale={ja}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
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
                        <div className="grid grid-cols-1 gap-3">
                          {FIELD_OPTIONS.map((field) => (
                            <div
                              key={field.id}
                              className={cn(
                                "border rounded-lg p-3 cursor-pointer transition-colors",
                                selectedThingIds.includes(field.id)
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                              onClick={() => handleFieldToggle(field.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {field.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {field.type === "field" ? "ほ場" : "温室"} •{" "}
                                    {field.area}㎡
                                  </div>
                                </div>
                                {selectedThingIds.includes(field.id) && (
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedFields.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {selectedFields.map((field) => (
                              <Badge key={field.id} variant="secondary">
                                {field.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormMessage />
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
                              <SelectTrigger>
                                <SelectValue placeholder="天気を選択" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WEATHER_OPTIONS.map((weather) => (
                                <SelectItem key={weather} value={weather}>
                                  {weather}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
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
                          <FormMessage />
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
                            placeholder="作業の詳細や気づいたことを記録してください（任意）"
                            className="min-h-[7.5rem] lg:min-h-[12rem] max-w-full resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* モバイル用のフッターボタン */}
        <div className="p-4 border-t lg:hidden">
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
            </Button>
            <Button
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

// 型エクスポート
export type { DiaryFormData };
