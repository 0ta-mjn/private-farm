import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  DiaryFormDrawer,
  type DiaryFormData,
  type FieldOption,
} from "./diary-form-drawer";

// モックデータ
const mockFieldOptions: FieldOption[] = [
  { id: "field-1", name: "A区画（トマト）", type: "field", area: 100 },
  { id: "field-2", name: "B区画（きゅうり）", type: "field", area: 150 },
  { id: "house-1", name: "第1温室", type: "house", area: 200 },
];

const mockInitialData: DiaryFormData = {
  date: new Date("2022-06-07"),
  title: "テスト日誌",
  content: "テスト作業内容",
  workType: "PLANTING",
  weather: "SUNNY",
  temperature: 25,
  thingIds: ["field-1"],
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  fieldOptions: mockFieldOptions,
};

describe("DiaryFormDrawer", () => {
  beforeEach(() => {
    // Radix UI の内部で呼ばれるメソッドをモック
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    vi.clearAllMocks();
  });

  describe("基本レンダリング", () => {
    test("新規作成・編集モードでの基本レンダリングと初期データ表示", () => {
      // 新規作成モード
      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} isEdit={false} />
      );

      // 基本要素が表示されること（デスクトップまたはモバイル）
      const drawerElement = screen.queryByTestId("diary-form-drawer");
      const sheetElement = screen.queryByTestId("diary-form-sheet");
      expect(drawerElement || sheetElement).toBeInTheDocument();
      expect(screen.getByTestId("diary-form")).toBeInTheDocument();
      expect(screen.getByTestId("work-type-select")).toBeInTheDocument();
      expect(screen.getByTestId("date-picker-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("weather-select")).toBeInTheDocument();
      expect(screen.getByTestId("temperature-input")).toBeInTheDocument();
      expect(screen.getByTestId("content-textarea")).toBeInTheDocument();

      // レスポンシブボタンが表示されること（デスクトップまたはモバイル）
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const desktopCancelButton = screen.queryByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.queryByTestId("cancel-button-mobile");

      // デスクトップまたはモバイルのいずれかのボタンが存在することを確認
      const hasDesktopButtons = desktopSubmitButton && desktopCancelButton;
      const hasMobileButtons = mobileSubmitButton && mobileCancelButton;
      expect(hasDesktopButtons || hasMobileButtons).toBeTruthy();

      // 編集モードに変更
      rerender(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 初期データが正しく表示されること
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;

      expect(temperatureInput.value).toBe("25");
      expect(contentTextarea.value).toBe("テスト作業内容");
      expect(screen.getByTestId("selected-fields-badges")).toBeInTheDocument();
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
    });

    test("区画オプションの表示", () => {
      render(<DiaryFormDrawer {...defaultProps} />);

      // 区画オプションが正しく表示されること
      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();
      expect(screen.getByTestId("field-option-field-1")).toBeInTheDocument();
      expect(screen.getByTestId("field-option-field-2")).toBeInTheDocument();
      expect(screen.getByTestId("field-option-house-1")).toBeInTheDocument();
      expect(screen.getByText("A区画（トマト）")).toBeInTheDocument();
      expect(screen.getByText("B区画（きゅうり）")).toBeInTheDocument();
      expect(screen.getByText("第1温室")).toBeInTheDocument();
    });

    test("区画オプションが空の場合の処理", () => {
      render(<DiaryFormDrawer {...defaultProps} fieldOptions={[]} />);

      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("diary-form")).toBeInTheDocument();
      expect(screen.getByTestId("work-type-select")).toBeInTheDocument();
    });
  });

  describe("フォーム操作", () => {
    test("全ての区画の操作", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 作業種別の選択
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 日付の変更
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);
      const calendar = screen.getByTestId("date-picker-calendar");
      expect(calendar).toBeInTheDocument();

      // 天気の選択
      const weatherSelect = screen.getByTestId("weather-select");
      await user.click(weatherSelect);
      expect(screen.getByTestId("weather-options")).toBeInTheDocument();
      const sunnyOption = screen.getByTestId("weather-option-SUNNY");
      await user.click(sunnyOption);

      // 気温の入力
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      expect(temperatureInput.value).toBe("");
      await user.type(temperatureInput, "25");
      expect(temperatureInput.value).toBe("25");

      // マイナス値の入力
      await user.clear(temperatureInput);
      await user.type(temperatureInput, "-5");
      expect(temperatureInput.value).toBe("-5");

      // 小数点を含む値の入力
      await user.clear(temperatureInput);
      await user.type(temperatureInput, "25.5");
      expect(temperatureInput.value).toBe("25.5");

      // 作業メモの入力
      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;
      expect(contentTextarea.value).toBe("");
      const testContent =
        "今日は種まきを行いました。\n天気が良く作業が順調に進みました。";
      await user.type(contentTextarea, testContent);
      expect(contentTextarea.value).toBe(testContent);
    });

    test("区画の選択・解除とバッジ表示", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 初期状態では何も選択されていない
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();

      // 単体選択
      {
        const field1Option = screen.getByTestId("field-option-field-1");
        await user.click(field1Option);
        expect(
          screen.getByTestId("selected-fields-badges")
        ).toBeInTheDocument();
        expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
      }

      // 複数選択
      {
        const field2Option = screen.getByTestId("field-option-field-2");
        await user.click(field2Option);
        expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();
        const house1Option = screen.getByTestId("field-option-house-1");
        await user.click(house1Option);
        expect(screen.getByTestId("field-checkbox-house-1")).toBeChecked();
      }

      // チェックされている区画の数を確認
      {
        const checkedCheckboxes = screen.getAllByRole("checkbox", {
          checked: true,
        });
        expect(checkedCheckboxes).toHaveLength(3);
      }

      // 選択解除
      {
        const field1Option = screen.getByTestId("field-option-field-1");
        await user.click(field1Option);
        await waitFor(() => {
          expect(
            screen.getByTestId("field-checkbox-field-1")
          ).not.toBeChecked();
        });
      }

      // 全て解除
      {
        const field2Option = screen.getByTestId("field-option-field-2");
        await user.click(field2Option);
        const house1Option = screen.getByTestId("field-option-house-1");
        await user.click(house1Option);
        expect(
          screen.queryByTestId("selected-fields-badges")
        ).not.toBeInTheDocument();
      }
    });
  });

  describe("バリデーション", () => {
    test("必須・非必須区画のバリデーション", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // デスクトップまたはモバイルの送信ボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      // 作業種別未選択で送信
      await user.click(submitButton);

      // 作業種別エラーが表示され、送信されないこと
      await waitFor(() => {
        expect(screen.getByTestId("work-type-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();

      // 作業種別のみ選択
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 他の区画は空のまま送信
      await user.click(submitButton);

      // 非必須区画のエラーが表示されないこと
      expect(screen.queryByTestId("content-error")).not.toBeInTheDocument();
      expect(screen.queryByTestId("weather-error")).not.toBeInTheDocument();
      expect(screen.queryByTestId("temperature-error")).not.toBeInTheDocument();

      // 送信が成功すること
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    test("日付のデフォルト値設定", () => {
      render(<DiaryFormDrawer {...defaultProps} />);

      // 今日の日付がデフォルトで設定されていること
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      expect(datePickerTrigger).toBeInTheDocument();

      const today = new Date();
      const expectedDateText = format(today, "PPP", { locale: ja });
      expect(datePickerTrigger).toHaveTextContent(expectedDateText);
    });

    test("気温の数値バリデーション", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;

      // 数値以外の文字を入力
      await user.type(temperatureInput, "abc");
      expect(temperatureInput.value).toBe(""); // type="number"により無効な文字は入力されない

      // 必須区画を入力して送信
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // デスクトップまたはモバイルの送信ボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      await user.click(submitButton);

      // 気温エラーが表示されず、送信成功
      expect(screen.queryByTestId("temperature-error")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe("フォーム送信", () => {
    test("新規作成での送信", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} isEdit={false} />);

      // 全区画を入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      const temperatureInput = screen.getByTestId("temperature-input");
      await user.type(temperatureInput, "25");

      const contentTextarea = screen.getByTestId("content-textarea");
      await user.type(contentTextarea, "テスト作業内容");

      const weatherSelect = screen.getByTestId("weather-select");
      await user.click(weatherSelect);
      await waitFor(() => {
        expect(screen.getByTestId("weather-options")).toBeInTheDocument();
      });
      const sunnyOption = screen.getByTestId("weather-option-SUNNY");
      await user.click(sunnyOption);

      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option);

      // デスクトップまたはモバイルの送信ボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      await user.click(submitButton);

      // 送信が成功し、正しいデータが渡されること
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();
      expect(submittedData).toHaveProperty("date");
      expect(submittedData).toHaveProperty("workType", "PLANTING");
      expect(submittedData).toHaveProperty("weather", "SUNNY");
      expect(submittedData).toHaveProperty("temperature", 25);
      expect(submittedData).toHaveProperty("content", "テスト作業内容");
      expect(submittedData).toHaveProperty("thingIds", ["field-1"]);
    });

    test("編集モードでの送信と初期データ保持", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 初期データのまま送信
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      let submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.workType).toBe(mockInitialData.workType);
      expect(submittedData?.content).toBe(mockInitialData.content);
      expect(submittedData?.weather).toBe(mockInitialData.weather);
      expect(submittedData?.temperature).toBe(mockInitialData.temperature);
      expect(submittedData?.thingIds).toEqual(mockInitialData.thingIds);
      expect(submittedData?.date).toEqual(mockInitialData.date);

      // リセット
      vi.clearAllMocks();

      // 再レンダリングして全データを変更
      rerender(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 全項目を変更
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const harvestingOption = screen.getByTestId(
        "work-type-option-HARVESTING"
      );
      await user.click(harvestingOption);

      const weatherSelect = screen.getByTestId("weather-select");
      await user.click(weatherSelect);
      await waitFor(() => {
        expect(screen.getByTestId("weather-options")).toBeInTheDocument();
      });
      const rainyOption = screen.getByTestId("weather-option-RAINY");
      await user.click(rainyOption);

      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      await user.click(temperatureInput);
      temperatureInput.value = "";
      await user.type(temperatureInput, "18");

      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;
      await user.click(contentTextarea);
      contentTextarea.value = "";
      await user.type(contentTextarea, "更新された作業内容");

      // 区画選択を変更
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option); // 既存の選択を解除
      const field2Option = screen.getByTestId("field-option-field-2");
      await user.click(field2Option); // 新しい選択を追加

      // 送信
      const submitButtonSecond =
        screen.queryByTestId("submit-button-desktop") ||
        screen.queryByTestId("submit-button-mobile");
      if (!submitButtonSecond) {
        throw new Error("送信ボタンが見つかりません");
      }
      await user.click(submitButtonSecond);

      // 変更されたデータで送信
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.workType).toBe("HARVESTING");
      expect(submittedData?.weather).toBe("RAINY");
      expect(submittedData?.temperature).toBe(18);
      expect(submittedData?.content).toBe("更新された作業内容");
      expect(submittedData?.thingIds).toEqual(["field-2"]);
    });

    test("複数区画選択での送信", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須区画を入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 複数区画を選択
      const field1Option = screen.getByTestId("field-option-field-1");

      await user.click(field1Option);
      await waitFor(() => {
        expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
      });
      const field2Option = screen.getByTestId("field-option-field-2");
      await user.click(field2Option);
      await waitFor(() => {
        expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();
      });
      const house1Option = screen.getByTestId("field-option-house-1");
      await user.click(house1Option);
      await waitFor(() => {
        expect(screen.getByTestId("field-checkbox-house-1")).toBeChecked();
      });

      // 送信
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      await user.click(submitButton);

      // 複数の区画IDが送信されること
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.thingIds).toEqual([
        "field-1",
        "field-2",
        "house-1",
      ]);
    });

    test("フォーム直接送信とバリデーションエラー時の送信防止", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<DiaryFormDrawer {...defaultProps} />);

      // 必須区画を入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // フォーム直接送信（Enterキーでの送信をシミュレート）
      const form = screen.getByTestId("diary-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      // 前のコンポーネントをアンマウントしてからリセット
      unmount();
      vi.clearAllMocks();

      // バリデーションエラーがある場合の送信防止
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須区画を入力せずに送信
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // バリデーションエラーが表示され、送信されない
      await waitFor(() => {
        expect(screen.getByTestId("work-type-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("ドロワー操作とUI状態", () => {
    test("キャンセルボタンの動作", async () => {
      const mockOnClose = vi.fn();
      const user = userEvent.setup();

      render(<DiaryFormDrawer {...defaultProps} onClose={mockOnClose} />);

      // デスクトップまたはモバイルのキャンセルボタンを確認
      const desktopCancelButton = screen.queryByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.queryByTestId("cancel-button-mobile");

      // 存在するキャンセルボタンをクリック
      if (desktopCancelButton) {
        await user.click(desktopCancelButton);
        expect(mockOnClose).toHaveBeenCalledOnce();
      } else if (mobileCancelButton) {
        await user.click(mobileCancelButton);
        expect(mockOnClose).toHaveBeenCalledOnce();
      } else {
        throw new Error("キャンセルボタンが見つかりません");
      }
    });

    test("送信状態での UI 変更", () => {
      // 送信中状態
      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} isSubmitting={true} />
      );

      // 表示されているボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const desktopCancelButton = screen.queryByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.queryByTestId("cancel-button-mobile");

      // 表示されているボタンが無効化されること
      if (desktopSubmitButton) {
        expect(desktopSubmitButton).toBeDisabled();
        expect(desktopSubmitButton).toHaveTextContent("保存中...");
      }
      if (mobileSubmitButton) {
        expect(mobileSubmitButton).toBeDisabled();
        expect(mobileSubmitButton).toHaveTextContent("保存中...");
      }
      if (desktopCancelButton) {
        expect(desktopCancelButton).toBeDisabled();
      }
      if (mobileCancelButton) {
        expect(mobileCancelButton).toBeDisabled();
      }

      // 送信完了状態に変更
      rerender(<DiaryFormDrawer {...defaultProps} isSubmitting={false} />);

      // 表示されているボタンを再取得
      const updatedDesktopSubmitButton = screen.queryByTestId(
        "submit-button-desktop"
      );
      const updatedMobileSubmitButton = screen.queryByTestId(
        "submit-button-mobile"
      );
      const updatedDesktopCancelButton = screen.queryByTestId(
        "cancel-button-desktop"
      );
      const updatedMobileCancelButton = screen.queryByTestId(
        "cancel-button-mobile"
      );

      // ボタンが有効になること
      if (updatedDesktopSubmitButton) {
        expect(updatedDesktopSubmitButton).not.toBeDisabled();
      }
      if (updatedMobileSubmitButton) {
        expect(updatedMobileSubmitButton).not.toBeDisabled();
      }
      if (updatedDesktopCancelButton) {
        expect(updatedDesktopCancelButton).not.toBeDisabled();
      }
      if (updatedMobileCancelButton) {
        expect(updatedMobileCancelButton).not.toBeDisabled();
      }
    });

    test("新規作成・編集モードでのタイトルとボタンテキスト変更", () => {
      // 新規作成モード
      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} isEdit={false} />
      );

      // タイトルの確認
      const title = screen.queryByText("農業日誌を作成");
      expect(title).toBeInTheDocument();

      // ボタンテキストの確認（表示されているボタンのみ）
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");

      if (desktopSubmitButton) {
        expect(desktopSubmitButton).toHaveTextContent("作成");
      }
      if (mobileSubmitButton) {
        expect(mobileSubmitButton).toHaveTextContent("作成");
      }

      // 編集モードに変更
      rerender(<DiaryFormDrawer {...defaultProps} isEdit={true} />);

      // タイトルの確認
      const editTitle = screen.queryByText("農業日誌を編集");
      expect(editTitle).toBeInTheDocument();

      // ボタンテキストの確認（表示されているボタンのみ）
      const updatedDesktopSubmitButton = screen.queryByTestId(
        "submit-button-desktop"
      );
      const updatedMobileSubmitButton = screen.queryByTestId(
        "submit-button-mobile"
      );

      if (updatedDesktopSubmitButton) {
        expect(updatedDesktopSubmitButton).toHaveTextContent("更新");
      }
      if (updatedMobileSubmitButton) {
        expect(updatedMobileSubmitButton).toHaveTextContent("更新");
      }
    });

    test("レスポンシブボタンの表示", () => {
      render(<DiaryFormDrawer {...defaultProps} />);

      // 画面サイズに応じて適切なボタンが表示されることを確認
      // デスクトップサイズの場合はデスクトップボタンのみ表示
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const desktopCancelButton = screen.queryByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.queryByTestId("cancel-button-mobile");

      // デスクトップまたはモバイルのいずれかのボタンが存在することを確認
      const hasDesktopButtons = desktopSubmitButton && desktopCancelButton;
      const hasMobileButtons = mobileSubmitButton && mobileCancelButton;

      expect(hasDesktopButtons || hasMobileButtons).toBeTruthy();

      // 存在するボタンのテキストを確認
      if (hasDesktopButtons) {
        expect(desktopSubmitButton).toHaveTextContent("作成");
        expect(desktopCancelButton).toHaveTextContent("キャンセル");
      }

      if (hasMobileButtons) {
        expect(mobileSubmitButton).toHaveTextContent("作成");
        expect(mobileCancelButton).toHaveTextContent("キャンセル");
      }
    });
  });

  describe("Props変更とエッジケース", () => {
    test("初期データの変更とリセット", async () => {
      const initialData1: DiaryFormData = {
        date: new Date("2023-01-15"),
        title: "初期タイトル1",
        content: "初期内容1",
        workType: "PLANTING",
        weather: "SUNNY",
        temperature: 20,
        thingIds: ["field-1"],
      };

      const { rerender } = render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={initialData1}
        />
      );

      // 初期データ1が反映されていることを確認
      expect(screen.getByTestId("content-textarea")).toHaveValue("初期内容1");
      expect(screen.getByTestId("temperature-input")).toHaveValue(20);
      expect(screen.getByTestId("work-type-select")).toHaveTextContent(
        "植付け"
      );
      expect(screen.getByTestId("weather-select")).toHaveTextContent("晴れ");
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();

      // 異なる初期データに変更
      const initialData2: DiaryFormData = {
        date: new Date("2023-02-20"),
        title: "初期タイトル2",
        content: "初期内容2",
        workType: "HARVESTING",
        weather: "RAINY",
        temperature: 15,
        thingIds: ["field-2", "house-1"],
      };

      rerender(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={initialData2}
        />
      );

      // 新しい初期データが反映されることを確認
      await waitFor(() => {
        expect(screen.getByTestId("content-textarea")).toHaveValue("初期内容2");
        expect(screen.getByTestId("temperature-input")).toHaveValue(15);
        expect(screen.getByTestId("work-type-select")).toHaveTextContent(
          "収穫"
        );
        expect(screen.getByTestId("weather-select")).toHaveTextContent("雨");
      });

      expect(screen.getByTestId("field-checkbox-field-1")).not.toBeChecked();
      expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();
      expect(screen.getByTestId("field-checkbox-house-1")).toBeChecked();

      // undefinedの場合のデフォルト値設定
      rerender(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={false}
          initialData={undefined}
        />
      );

      expect(screen.getByTestId("content-textarea")).toHaveValue("");
      expect(screen.getByTestId("temperature-input")).toHaveValue(null);
      expect(screen.getByTestId("work-type-select")).toHaveTextContent(
        "作業種別を選択"
      );
      expect(screen.getByTestId("weather-select")).toHaveTextContent(
        "天気を選択"
      );

      // 今日の日付が設定されていることを確認
      const today = new Date();
      const expectedDate = format(today, "PPP", { locale: ja });
      expect(screen.getByTestId("date-picker-trigger")).toHaveTextContent(
        expectedDate
      );
    });

    test("fieldOptionsの動的変更", () => {
      const initialFieldOptions: FieldOption[] = [
        { id: "field-1", name: "A区画（トマト）", type: "field", area: 100 },
        { id: "field-2", name: "B区画（きゅうり）", type: "field", area: 150 },
      ];

      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} fieldOptions={initialFieldOptions} />
      );

      // 初期の選択肢が表示されていることを確認
      expect(screen.getByTestId("field-option-field-1")).toBeInTheDocument();
      expect(screen.getByTestId("field-option-field-2")).toBeInTheDocument();
      expect(
        screen.queryByTestId("field-option-house-1")
      ).not.toBeInTheDocument();

      // fieldOptionsを更新
      const updatedFieldOptions: FieldOption[] = [
        { id: "field-1", name: "A区画（トマト）", type: "field", area: 100 },
        { id: "house-1", name: "第1温室", type: "house", area: 200 },
        { id: "field-3", name: "C区画（なす）", type: "field", area: 120 },
      ];

      rerender(
        <DiaryFormDrawer {...defaultProps} fieldOptions={updatedFieldOptions} />
      );

      // 新しい選択肢が表示され、古い選択肢が削除されていることを確認
      expect(screen.getByTestId("field-option-field-1")).toBeInTheDocument();
      expect(
        screen.queryByTestId("field-option-field-2")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("field-option-house-1")).toBeInTheDocument();
      expect(screen.getByTestId("field-option-field-3")).toBeInTheDocument();

      // 空の配列に変更
      rerender(<DiaryFormDrawer {...defaultProps} fieldOptions={[]} />);

      // 全ての選択肢が削除されることを確認
      expect(
        screen.queryByTestId("field-option-field-1")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("field-option-house-1")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("field-option-field-3")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();
    });

    test("コールバック関数の変更", async () => {
      const mockOnClose1 = vi.fn();
      const mockOnClose2 = vi.fn();
      const mockOnSubmit1 = vi.fn();
      const mockOnSubmit2 = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <DiaryFormDrawer
          {...defaultProps}
          onClose={mockOnClose1}
          onSubmit={mockOnSubmit1}
        />
      );

      // 最初のonClose関数でキャンセル
      const firstCancelButton =
        screen.queryByTestId("cancel-button-desktop") ||
        screen.queryByTestId("cancel-button-mobile");
      if (!firstCancelButton) {
        throw new Error("キャンセルボタンが見つかりません");
      }
      await user.click(firstCancelButton);
      expect(mockOnClose1).toHaveBeenCalledOnce();
      expect(mockOnClose2).not.toHaveBeenCalled();

      // コールバック関数を変更
      rerender(
        <DiaryFormDrawer
          {...defaultProps}
          onClose={mockOnClose2}
          onSubmit={mockOnSubmit2}
        />
      );

      // 新しいonClose関数でキャンセル
      const secondCancelButton =
        screen.queryByTestId("cancel-button-desktop") ||
        screen.queryByTestId("cancel-button-mobile");
      if (!secondCancelButton) {
        throw new Error("キャンセルボタンが見つかりません");
      }
      await user.click(secondCancelButton);
      expect(mockOnClose2).toHaveBeenCalledOnce();

      // 送信テスト用に必須区画を入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("work-type-option-PLANTING"));

      // 新しいonSubmit関数で送信
      const submitButtonForTest =
        screen.queryByTestId("submit-button-desktop") ||
        screen.queryByTestId("submit-button-mobile");
      if (!submitButtonForTest) {
        throw new Error("送信ボタンが見つかりません");
      }
      await user.click(submitButtonForTest);

      await waitFor(() => {
        expect(mockOnSubmit2).toHaveBeenCalledOnce();
      });
      expect(mockOnSubmit1).not.toHaveBeenCalled();
    });

    test("エッジケースの処理", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 未来の日付選択の制限
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      await waitFor(() => {
        expect(screen.getByTestId("date-picker-calendar")).toBeInTheDocument();
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.toLocaleDateString();
      const calendar = screen.getByTestId("date-picker-calendar");
      const tomorrowButton = calendar.querySelector(
        `[data-day="${tomorrowDay}}"]`
      );

      // 未来の日付は無効化されているか、存在しない
      if (tomorrowButton) {
        expect(tomorrowButton).toHaveAttribute("disabled", "");
      }

      // 気温の各種値のテスト
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;

      // マイナス値
      await user.type(temperatureInput, "-10");
      expect(temperatureInput.value).toBe("-10");

      // 小数点値
      await user.clear(temperatureInput);
      await user.type(temperatureInput, "25.5");
      expect(temperatureInput.value).toBe("25.5");

      // 送信でマイナス値と小数点値が正しく送信されることを確認
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      await user.click(screen.getByTestId("work-type-option-PLANTING"));

      const submitButtonForEdgeCase =
        screen.queryByTestId("submit-button-desktop") ||
        screen.queryByTestId("submit-button-mobile");
      if (!submitButtonForEdgeCase) {
        throw new Error("送信ボタンが見つかりません");
      }
      await user.click(submitButtonForEdgeCase);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.temperature).toBe(25.5);
    });
  });
});
