"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shadcn/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shadcn/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shadcn/form";
import { Input } from "@/shadcn/input";
import { Textarea } from "@/shadcn/textarea";
import { Button } from "@/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shadcn/select";
import { useMediaQuery } from "@/hooks/use-mobile";
import { THING_TYPE_DISPLAY_OPTIONS } from "@/constants/agricultural-constants";

// フォームスキーマ定義
const ThingFormSchema = z.object({
  name: z
    .string()
    .min(1, "区画名は必須です")
    .max(255, "区画名は255文字以内で入力してください"),
  type: z
    .string()
    .min(1, "区画の種類は必須です")
    .max(100, "区画の種類は100文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional(),
  location: z
    .string()
    .max(255, "場所は255文字以内で入力してください")
    .optional(),
  area: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "面積は正の数値で入力してください"),
});

type ThingFormData = z.infer<typeof ThingFormSchema>;

export type { ThingFormData };

interface ThingFormDrawerProps {
  open: boolean;
  onClose: () => void;
  isEdit?: boolean;
  isSubmitting?: boolean;
  initialData?: ThingFormData;
  onSubmit: (data: ThingFormData) => void;
}

export function ThingFormDrawer({
  open,
  onClose,
  isEdit = false,
  isSubmitting = false,
  initialData,
  onSubmit,
}: ThingFormDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const form = useForm<ThingFormData>({
    resolver: zodResolver(ThingFormSchema),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      location: "",
      area: "",
    },
  });

  // 初期データでフォームを設定
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        type: initialData.type || "",
        description: initialData.description || "",
        location: initialData.location || "",
        area: initialData.area || "",
      });
    } else {
      // 新規作成モードの場合、フォームをリセット
      form.reset({
        name: "",
        type: "",
        description: "",
        location: "",
        area: "",
      });
    }
  }, [initialData, form]);

  const handleSubmit = (data: ThingFormData) => {
    onSubmit(data);
  };

  // フォームコンテンツを共通化
  const FormContent = () => (
    <Form {...form}>
      <form
        data-testid="thing-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {/* 区画名 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                区画名 <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  data-testid="name-input"
                  placeholder="例: 北側ブロックA"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage data-testid="name-error" />
            </FormItem>
          )}
        />

        {/* 種類 */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                種類 <span className="text-destructive">*</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger data-testid="type-select">
                    <SelectValue placeholder="区画の種類を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent data-testid="type-options">
                  {THING_TYPE_DISPLAY_OPTIONS.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      data-testid={`type-option-${type.value}`}
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage data-testid="type-error" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* 場所 */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>場所（任意）</FormLabel>
                <FormControl>
                  <Input
                    data-testid="location-input"
                    placeholder="例: 北側圃場"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage data-testid="location-error" />
              </FormItem>
            )}
          />

          {/* 面積 */}
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>面積（㎡）</FormLabel>
                <FormControl>
                  <Input
                    data-testid="area-input"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="例: 100"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage data-testid="area-error" />
              </FormItem>
            )}
          />
        </div>

        {/* メモ */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メモ</FormLabel>
              <FormControl>
                <Textarea
                  data-testid="description-textarea"
                  placeholder="区画の特徴や注意事項などを入力してください"
                  className="min-h-[3.5rem] lg:min-h-[5rem] max-w-full resize-none"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage data-testid="description-error" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent data-testid="thing-form-dialog" className="max-w-md">
          <DialogHeader className="text-left border-b pb-4 gap-2">
            <DialogTitle>{isEdit ? "区画を編集" : "区画を作成"}</DialogTitle>
            <DialogDescription>
              区画はセンサーや作物の管理単位です。
              <br />
              例えば、4ブロックに分けて輪作する場合、1ブロックずつ区画に登録します。
            </DialogDescription>
          </DialogHeader>

          <FormContent />

          <DialogFooter
            className="flex items-center justify-end gap-2 pb-4 px-3"
            data-testid="desktop-actions"
          >
            <Button
              data-testid="cancel-button-desktop"
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>

            <Button
              data-testid="submit-button-desktop"
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent data-testid="thing-form-drawer">
        <DrawerHeader className="text-left border-b">
          <DrawerTitle>{isEdit ? "区画を編集" : "区画を作成"}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 p-4 overflow-y-auto">
          <FormContent />
        </div>

        <DrawerFooter
          className="p-4 border-t grid grid-cols-2 gap-2"
          data-testid="mobile-actions"
        >
          <Button
            data-testid="cancel-button-mobile"
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>

          <Button
            data-testid="submit-button-mobile"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
