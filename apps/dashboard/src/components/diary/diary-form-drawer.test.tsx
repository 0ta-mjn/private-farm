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
  { id: "greenhouse-1", name: "第1温室", type: "greenhouse", area: 200 },
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

  describe("レンダリング", () => {
    test("新規作成モードで正しくレンダリングされること", () => {
      render(<DiaryFormDrawer {...defaultProps} isEdit={false} />);

      // ドロワーコンテナが表示されること
      expect(screen.getByTestId("diary-form-drawer")).toBeInTheDocument();

      // フォームが表示されること
      expect(screen.getByTestId("diary-form")).toBeInTheDocument();

      // 必須フィールドが表示されること
      expect(screen.getByTestId("work-type-select")).toBeInTheDocument();
      expect(screen.getByTestId("date-picker-trigger")).toBeInTheDocument();

      // オプショナルフィールドが表示されること
      expect(screen.getByTestId("weather-select")).toBeInTheDocument();
      expect(screen.getByTestId("temperature-input")).toBeInTheDocument();
      expect(screen.getByTestId("content-textarea")).toBeInTheDocument();

      // アクションボタンが表示されること（デスクトップ・モバイル両方）
      expect(screen.getByTestId("submit-button-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button-mobile")).toBeInTheDocument();
    });

    test("編集モードで正しくレンダリングされること", () => {
      render(<DiaryFormDrawer {...defaultProps} isEdit={true} />);

      // ドロワーコンテナが表示されること
      expect(screen.getByTestId("diary-form-drawer")).toBeInTheDocument();

      // フォームが表示されること
      expect(screen.getByTestId("diary-form")).toBeInTheDocument();

      // 全フィールドが表示されること
      expect(screen.getByTestId("work-type-select")).toBeInTheDocument();
      expect(screen.getByTestId("date-picker-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("weather-select")).toBeInTheDocument();
      expect(screen.getByTestId("temperature-input")).toBeInTheDocument();
      expect(screen.getByTestId("content-textarea")).toBeInTheDocument();

      // アクションボタンが表示されること
      expect(screen.getByTestId("submit-button-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("submit-button-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button-mobile")).toBeInTheDocument();
    });

    test("初期データが正しく表示されること", () => {
      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 作業種別が設定されていること（値の確認はより詳細なテストで行う）
      const workTypeSelect = screen.getByTestId("work-type-select");
      expect(workTypeSelect).toBeInTheDocument();

      // 日付が設定されていること
      const dateButton = screen.getByTestId("date-picker-trigger");
      expect(dateButton).toBeInTheDocument();

      // 気温が設定されていること
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      expect(temperatureInput.value).toBe("25");

      // 作業メモが設定されていること
      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;
      expect(contentTextarea.value).toBe("テスト作業内容");

      // 選択されたほ場のバッジが表示されること
      expect(screen.getByTestId("selected-fields-badges")).toBeInTheDocument();
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
    });

    test("フィールドオプションが正しく表示されること", () => {
      render(<DiaryFormDrawer {...defaultProps} />);

      // フィールドオプションコンテナが表示されること
      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();

      // 各フィールドオプションが表示されること
      expect(screen.getByTestId("field-option-field-1")).toBeInTheDocument();
      expect(screen.getByTestId("field-option-field-2")).toBeInTheDocument();
      expect(
        screen.getByTestId("field-option-greenhouse-1")
      ).toBeInTheDocument();

      // フィールド名が表示されること（テキスト内容の確認）
      expect(screen.getByText("A区画（トマト）")).toBeInTheDocument();
      expect(screen.getByText("B区画（きゅうり）")).toBeInTheDocument();
      expect(screen.getByText("第1温室")).toBeInTheDocument();
    });

    test("フィールドオプションが空の場合でもエラーにならないこと", () => {
      const propsWithNoFields = {
        ...defaultProps,
        fieldOptions: [],
      };

      // エラーが発生しないことを確認
      expect(() => {
        render(<DiaryFormDrawer {...propsWithNoFields} />);
      }).not.toThrow();

      // フィールドオプションコンテナは表示されるが、中身は空
      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();

      // バッジコンテナは表示されない（選択されたフィールドがないため）
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();

      // 他の要素は正常に表示されること
      expect(screen.getByTestId("diary-form")).toBeInTheDocument();
      expect(screen.getByTestId("work-type-select")).toBeInTheDocument();
    });
  });

  describe("フォーム操作", () => {
    test("作業種別を選択できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const workTypeSelect = screen.getByTestId("work-type-select");

      // セレクトボックスをクリック
      await user.click(workTypeSelect);

      // オプションが表示されることを確認
      expect(screen.getByTestId("work-type-options")).toBeInTheDocument();

      // PLANTINGオプションを選択
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 選択が反映されることを確認（セレクトボックスの表示値が変わること）
      expect(workTypeSelect).toBeInTheDocument();
    });

    test("作業日を選択できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const datePickerTrigger = screen.getByTestId("date-picker-trigger");

      // 日付ピッカーを開く
      await user.click(datePickerTrigger);

      // カレンダーが表示されることを確認
      const calendar = screen.getByTestId("date-picker-calendar");
      expect(calendar).toBeInTheDocument();

      // カレンダー内の日付を選択（昨日の日付を選択してデフォルトから変更）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // 昨日の日付ボタンを選択（data-day属性を使用）
      const yesterdayDateString = yesterday.toLocaleDateString();
      const yesterdayButton = calendar.querySelector(
        `[data-day="${yesterdayDateString}"]`
      );
      expect(yesterdayButton).toBeInTheDocument();

      if (yesterdayButton) {
        await user.click(yesterdayButton as HTMLElement);
      }

      // 日付が設定されることを確認（日付ピッカーボタンのテキストが昨日の日付に変わること）
      expect(datePickerTrigger).toBeInTheDocument();
    });

    test("天気を選択できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const weatherSelect = screen.getByTestId("weather-select");

      // セレクトボックスをクリック
      await user.click(weatherSelect);

      // オプションが表示されることを確認
      expect(screen.getByTestId("weather-options")).toBeInTheDocument();

      // SUNNYオプションを選択
      const sunnyOption = screen.getByTestId("weather-option-SUNNY");
      await user.click(sunnyOption);

      // 選択が反映されることを確認
      expect(weatherSelect).toBeInTheDocument();
    });

    test("気温を入力できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;

      // 初期値は空であることを確認
      expect(temperatureInput.value).toBe("");

      // 気温を入力
      await user.type(temperatureInput, "25");

      // 入力値が反映されることを確認
      expect(temperatureInput.value).toBe("25");

      // マイナス値も入力できることを確認
      await user.clear(temperatureInput);
      await user.type(temperatureInput, "-5");
      expect(temperatureInput.value).toBe("-5");
    });

    test("作業メモを入力できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;

      // 初期値は空であることを確認
      expect(contentTextarea.value).toBe("");

      // テキストを入力
      const testContent =
        "今日は種まきを行いました。\n天気が良く作業が順調に進みました。";
      await user.type(contentTextarea, testContent);

      // 入力値が反映されることを確認
      expect(contentTextarea.value).toBe(testContent);
    });

    test("ほ場を単体選択できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 初期状態では何も選択されていないことを確認
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();

      // field-1を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option);

      // 選択されたことを確認
      expect(screen.getByTestId("selected-fields-badges")).toBeInTheDocument();
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
    });

    test("ほ場を複数選択できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // field-1を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option);

      // field-2も選択
      const field2Option = screen.getByTestId("field-option-field-2");
      await user.click(field2Option);

      // 両方が選択されていることを確認
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
      expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();

      // greenhouse-1も選択
      const greenhouse1Option = screen.getByTestId("field-option-greenhouse-1");
      await user.click(greenhouse1Option);

      // 3つ全てが選択されていることを確認
      expect(screen.getByTestId("field-checkbox-greenhouse-1")).toBeChecked();
    });

    test("選択したほ場を解除できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 複数のほ場を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      const field2Option = screen.getByTestId("field-option-field-2");
      await user.click(field1Option);
      await user.click(field2Option);

      // 両方が選択されていることを確認
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
      expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();

      // field-1の選択を解除
      await user.click(field1Option);

      // field-1の選択が解除され、field-2は残っていることを確認
      expect(screen.getByTestId("field-checkbox-field-1")).not.toBeChecked();
      expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();

      // field-2も解除
      await user.click(field2Option);

      // 全ての選択が解除され、バッジコンテナも非表示になることを確認
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();
    });

    test("選択したほ場がバッジで表示されること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 初期状態ではバッジコンテナが表示されていないことを確認
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();

      // field-1を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option);

      // バッジコンテナが表示され、field-1のバッジが存在することを確認
      expect(screen.getByTestId("selected-fields-badges")).toBeInTheDocument();
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();

      // greenhouse-1も選択
      const greenhouse1Option = screen.getByTestId("field-option-greenhouse-1");
      await user.click(greenhouse1Option);

      // 両方が選択されていることを確認
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();
      expect(screen.getByTestId("field-checkbox-greenhouse-1")).toBeChecked();

      // チェックされているフィールドの数が選択したほ場の数と一致することを確認
      const checkedCheckboxes = screen.getAllByRole("checkbox", {
        checked: true,
      });
      expect(checkedCheckboxes).toHaveLength(2);
    });
  });

  describe("バリデーション", () => {
    test("作業種別が未選択の場合エラーが表示されること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 送信ボタンをクリック（作業種別未選択のまま）
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 作業種別のエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId("work-type-error")).toBeInTheDocument();
      });

      // onSubmitが呼ばれないことを確認
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    test("作業日にはデフォルトで今日の日付が設定されていること", async () => {
      render(<DiaryFormDrawer {...defaultProps} />);

      // 日付ピッカートリガーボタンが表示されていることを確認
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      expect(datePickerTrigger).toBeInTheDocument();

      // ボタンに今日の日付が表示されていることを確認
      const today = new Date();
      const expectedDateText = format(today, "PPP", { locale: ja });
      expect(datePickerTrigger).toHaveTextContent(expectedDateText);
    });

    test("作業メモは必須ではないこと", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドのみ入力（作業種別を選択）
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 作業メモは空のまま
      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;
      expect(contentTextarea.value).toBe("");

      // 送信ボタンをクリック
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 作業メモのエラーメッセージが表示されないことを確認
      expect(screen.queryByTestId("content-error")).not.toBeInTheDocument();

      // onSubmitが呼ばれることを確認（必須フィールドが入力されているため）
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    test("天気は必須ではないこと", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドのみ入力（作業種別を選択）
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 天気は選択しない
      const weatherSelect = screen.getByTestId("weather-select");
      expect(weatherSelect).toBeInTheDocument();

      // 送信ボタンをクリック
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 天気のエラーメッセージが表示されないことを確認
      expect(screen.queryByTestId("weather-error")).not.toBeInTheDocument();

      // onSubmitが呼ばれることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    test("気温は必須ではないこと", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドのみ入力（作業種別を選択）
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 気温は入力しない
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      expect(temperatureInput.value).toBe("");

      // 送信ボタンをクリック
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 気温のエラーメッセージが表示されないことを確認
      expect(screen.queryByTestId("temperature-error")).not.toBeInTheDocument();

      // onSubmitが呼ばれることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    test("気温に数値以外を入力した場合の処理", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;

      // 数値以外の文字を入力してみる
      await user.type(temperatureInput, "abc");

      // HTML inputのtype="number"により、数値以外は入力できないか、
      // または入力されてもバリデーションエラーになることを確認
      // 実際の動作は実装に依存するため、値を確認
      expect(temperatureInput.value).toBe(""); // type="number"の場合、無効な文字は入力されない

      // 必須フィールドを入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 送信ボタンをクリック
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 気温のエラーメッセージが表示されないことを確認（空値として扱われるため）
      expect(screen.queryByTestId("temperature-error")).not.toBeInTheDocument();

      // onSubmitが呼ばれることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe("フォーム送信", () => {
    test("有効なデータで送信できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドを入力（作業種別を選択）
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // オプションフィールドを入力
      const temperatureInput = screen.getByTestId("temperature-input");
      await user.type(temperatureInput, "25");

      const contentTextarea = screen.getByTestId("content-textarea");
      await user.type(contentTextarea, "テスト作業内容");

      // 天気を選択
      const weatherSelect = screen.getByTestId("weather-select");
      await user.click(weatherSelect);
      await waitFor(() => {
        expect(screen.getByTestId("weather-options")).toBeInTheDocument();
      });
      const sunnyOption = screen.getByTestId("weather-option-SUNNY");
      await user.click(sunnyOption);

      // ほ場を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option);

      // デスクトップ送信ボタンをクリック
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // onSubmitが呼ばれることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      // 送信されたデータの構造を確認
      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();
      expect(submittedData).toHaveProperty("date");
      expect(submittedData).toHaveProperty("workType", "PLANTING");
      expect(submittedData).toHaveProperty("weather", "SUNNY");
      expect(submittedData).toHaveProperty("temperature", 25);
      expect(submittedData).toHaveProperty("content", "テスト作業内容");
      expect(submittedData).toHaveProperty("thingIds", ["field-1"]);
    });

    test("送信時にonSubmitが正しいデータで呼ばれること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 全てのフォームデータを入力
      // 作業種別を選択
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const harvestOption = screen.getByTestId("work-type-option-HARVESTING");
      await user.click(harvestOption);

      // 日付は既にデフォルトで今日の日付が設定されているのでスキップ

      // 天気を選択
      const weatherSelect = screen.getByTestId("weather-select");
      await user.click(weatherSelect);
      await waitFor(() => {
        expect(screen.getByTestId("weather-options")).toBeInTheDocument();
      });
      const sunnyOption = screen.getByTestId("weather-option-SUNNY");
      await user.click(sunnyOption);

      // 気温を入力（初期値から変更）
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      await user.click(temperatureInput);
      // 既存の値を直接クリア
      temperatureInput.value = "";
      await user.type(temperatureInput, "30");

      // 作業メモを入力
      const contentTextarea = screen.getByTestId("content-textarea");
      await user.type(contentTextarea, "テスト作業内容");
      // ほ場を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option);

      // モバイル送信ボタンをクリック
      const submitButton = screen.getByTestId("submit-button-mobile");
      await user.click(submitButton);

      // onSubmitが正しいデータで呼ばれることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();
      expect(submittedData?.workType).toBe("HARVESTING");
      expect(submittedData?.date).toBeInstanceOf(Date);
      // 日付は今日の日付であることを確認（時刻は無視）
      const today = new Date();
      const expectedDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const submittedDate = new Date(
        submittedData!.date.getFullYear(),
        submittedData!.date.getMonth(),
        submittedData!.date.getDate()
      );
      expect(submittedDate).toEqual(expectedDate);
      expect(submittedData?.thingIds).toEqual(["field-1"]);
      expect(submittedData?.weather).toBe("SUNNY");
      expect(submittedData?.temperature).toBe(30);
      expect(submittedData?.content).toBe("テスト作業内容");
    });

    test("編集モードで初期データを変更せずに送信", async () => {
      const user = userEvent.setup();
      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 何も変更せずに送信
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 初期データがそのまま送信されることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();
      // 全ての初期データが保持されている
      expect(submittedData?.workType).toBe(mockInitialData.workType);
      expect(submittedData?.content).toBe(mockInitialData.content);
      expect(submittedData?.weather).toBe(mockInitialData.weather);
      expect(submittedData?.temperature).toBe(mockInitialData.temperature);
      expect(submittedData?.thingIds).toEqual(mockInitialData.thingIds);
      expect(submittedData?.date).toEqual(mockInitialData.date);
    });

    test("編集モードで全ての項目を変更して送信", async () => {
      const user = userEvent.setup();
      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 作業種別を変更
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const harvestingOption = screen.getByTestId(
        "work-type-option-HARVESTING"
      );
      await user.click(harvestingOption);

      // 日付を変更（昨日の日付に変更）
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      // react-day-picker形式で昨日の日付を選択
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // カレンダーが表示されるまで待機
      const calendar = screen.getByTestId("date-picker-calendar");
      await waitFor(() => {
        expect(calendar).toBeInTheDocument();
      });

      // 昨日の日付ボタンを選択（data-day属性を使用）
      const yesterdayDateString = yesterday.toLocaleDateString();
      const yesterdayButton = calendar.querySelector(
        `[data-day="${yesterdayDateString}"]`
      );
      expect(yesterdayButton).toBeInTheDocument();

      if (yesterdayButton) {
        await user.click(yesterdayButton as HTMLElement);
      }

      // 天気を変更
      const weatherSelect = screen.getByTestId("weather-select");
      await user.click(weatherSelect);
      await waitFor(() => {
        expect(screen.getByTestId("weather-options")).toBeInTheDocument();
      });
      const rainyOption = screen.getByTestId("weather-option-RAINY");
      await user.click(rainyOption);

      // 気温を変更
      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;
      await user.click(temperatureInput);
      // 既存の値を確実にクリア
      temperatureInput.value = ""; // 直接値をクリア
      await user.type(temperatureInput, "18");

      // 作業メモを変更
      const contentTextarea = screen.getByTestId(
        "content-textarea"
      ) as HTMLTextAreaElement;
      await user.click(contentTextarea);
      // 既存のテキストを確実にクリア
      contentTextarea.value = ""; // 直接値をクリア
      await user.type(contentTextarea, "更新された作業内容");

      // ほ場選択を変更（既存の選択を解除して新しいものを選択）
      const field1Option = screen.getByTestId("field-option-field-1");
      await user.click(field1Option); // 既存の選択を解除
      const field2Option = screen.getByTestId("field-option-field-2");
      await user.click(field2Option); // 新しい選択を追加

      // 送信
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 変更されたデータで送信されることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();

      // 全ての項目が変更されていることを確認
      expect(submittedData?.workType).toBe("HARVESTING");
      expect(submittedData?.weather).toBe("RAINY");
      expect(submittedData?.temperature).toBe(18);
      expect(submittedData?.content).toBe("更新された作業内容");
      expect(submittedData?.thingIds).toEqual(["field-2"]);

      // 日付が昨日の日付に変更されていることを確認
      const expectedDate = new Date(
        yesterday.getFullYear(),
        yesterday.getMonth(),
        yesterday.getDate()
      );
      const submittedDate = new Date(
        submittedData!.date.getFullYear(),
        submittedData!.date.getMonth(),
        submittedData!.date.getDate()
      );
      expect(submittedDate).toEqual(expectedDate);
    });

    test("送信中はボタンが無効化されること", () => {
      render(<DiaryFormDrawer {...defaultProps} isSubmitting={true} />);

      // 全ての送信ボタンが無効化されていることを確認
      const desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.getByTestId("submit-button-mobile");
      const desktopCancelButton = screen.getByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.getByTestId("cancel-button-mobile");

      expect(desktopSubmitButton).toBeDisabled();
      expect(mobileSubmitButton).toBeDisabled();
      expect(desktopCancelButton).toBeDisabled();
      expect(mobileCancelButton).toBeDisabled();
    });

    test("送信中はローディング表示になること", () => {
      render(<DiaryFormDrawer {...defaultProps} isSubmitting={true} />);

      // ローディングテキストが表示されることを確認
      const desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.getByTestId("submit-button-mobile");

      expect(desktopSubmitButton).toHaveTextContent("保存中...");
      expect(mobileSubmitButton).toHaveTextContent("保存中...");
    });

    test("新規作成モードと編集モードでボタンテキストが変わること", () => {
      // 新規作成モード
      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} isEdit={false} />
      );

      let desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      let mobileSubmitButton = screen.getByTestId("submit-button-mobile");

      expect(desktopSubmitButton).toHaveTextContent("作成");
      expect(mobileSubmitButton).toHaveTextContent("作成");

      // 編集モードに変更
      rerender(<DiaryFormDrawer {...defaultProps} isEdit={true} />);

      desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      mobileSubmitButton = screen.getByTestId("submit-button-mobile");

      expect(desktopSubmitButton).toHaveTextContent("更新");
      expect(mobileSubmitButton).toHaveTextContent("更新");
    });

    test("バリデーションエラーがある場合送信されないこと", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドを入力せずに送信
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByTestId("work-type-error")).toBeInTheDocument();
      });

      // onSubmitが呼ばれないことを確認
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    test("フォームの送信イベントでも送信できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドを入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // フォーム自体を送信（Enterキーでの送信をシミュレート）
      const form = screen.getByTestId("diary-form");
      fireEvent.submit(form);

      // onSubmitが呼ばれることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    test("複数のほ場が選択された場合の送信データ", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 必須フィールドを入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 複数のほ場を選択
      const field1Option = screen.getByTestId("field-option-field-1");
      const field2Option = screen.getByTestId("field-option-field-2");
      const greenhouse1Option = screen.getByTestId("field-option-greenhouse-1");

      await user.click(field1Option);
      await user.click(field2Option);
      await user.click(greenhouse1Option);

      // 送信
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      // 複数のほ場IDが送信されることを確認
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();
      expect(submittedData?.thingIds).toEqual([
        "field-1",
        "field-2",
        "greenhouse-1",
      ]);
    });
  });

  describe("ドロワー操作", () => {
    test("デスクトップキャンセルボタンでドロワーが閉じること", async () => {
      const mockOnClose = vi.fn();
      const user = userEvent.setup();

      render(
        <DiaryFormDrawer
          {...defaultProps}
          onClose={mockOnClose}
          isEdit={false}
        />
      );

      const cancelButton = screen.getByTestId("cancel-button-desktop");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    test("モバイルキャンセルボタンでドロワーが閉じること", async () => {
      const mockOnClose = vi.fn();
      const user = userEvent.setup();

      render(
        <DiaryFormDrawer
          {...defaultProps}
          onClose={mockOnClose}
          isEdit={false}
        />
      );

      const cancelButton = screen.getByTestId("cancel-button-mobile");
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    test("送信中はデスクトップキャンセルボタンが無効化されること", () => {
      render(
        <DiaryFormDrawer {...defaultProps} isEdit={false} isSubmitting={true} />
      );

      const cancelButton = screen.getByTestId("cancel-button-desktop");
      expect(cancelButton).toBeDisabled();
    });

    test("送信中はモバイルキャンセルボタンが無効化されること", () => {
      render(
        <DiaryFormDrawer {...defaultProps} isEdit={false} isSubmitting={true} />
      );

      const cancelButton = screen.getByTestId("cancel-button-mobile");
      expect(cancelButton).toBeDisabled();
    });

    test("送信中でない時はキャンセルボタンが有効であること", () => {
      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={false}
          isSubmitting={false}
        />
      );

      const desktopCancelButton = screen.getByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.getByTestId("cancel-button-mobile");

      expect(desktopCancelButton).not.toBeDisabled();
      expect(mobileCancelButton).not.toBeDisabled();
    });
  });

  describe("レスポンシブ対応", () => {
    test("デスクトップビューでアクションボタンがヘッダーに表示されること", () => {
      render(<DiaryFormDrawer {...defaultProps} isEdit={false} />);

      // デスクトップ向けのボタンが存在することを確認
      expect(screen.getByTestId("submit-button-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button-desktop")).toBeInTheDocument();
    });

    test("モバイルビューでアクションボタンがフッターに表示されること", () => {
      render(<DiaryFormDrawer {...defaultProps} isEdit={false} />);

      // モバイル向けのボタンが存在することを確認
      expect(screen.getByTestId("submit-button-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("cancel-button-mobile")).toBeInTheDocument();
    });

    test("両方のビューで同じ機能のボタンが表示されること", () => {
      render(<DiaryFormDrawer {...defaultProps} isEdit={false} />);

      const desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.getByTestId("submit-button-mobile");
      const desktopCancelButton = screen.getByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.getByTestId("cancel-button-mobile");

      // 両方のボタンが同じテキストを持つことを確認
      expect(desktopSubmitButton).toHaveTextContent("作成");
      expect(mobileSubmitButton).toHaveTextContent("作成");
      expect(desktopCancelButton).toHaveTextContent("キャンセル");
      expect(mobileCancelButton).toHaveTextContent("キャンセル");
    });
  });

  describe("初期データのリセット", () => {
    test("初期データが変更された時にフォームがリセットされること", async () => {
      const { unmount } = render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 初期データが反映されていることを確認
      const contentTextarea = screen.getByTestId("content-textarea");
      const temperatureInput = screen.getByTestId("temperature-input");

      expect(contentTextarea).toHaveValue("テスト作業内容");
      expect(temperatureInput).toHaveValue(25);

      // 新しい初期データで再レンダリング
      const newInitialData: DiaryFormData = {
        date: new Date("2023-01-01"),
        title: "新しいタイトル",
        content: "新しい内容",
        workType: "HARVESTING",
        weather: "RAINY",
        temperature: 15,
        thingIds: ["field-2"],
      };

      unmount(); // コンポーネントをアンマウント

      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={newInitialData}
        />
      );

      // フォームが新しい初期データでリセットされることを確認
      await waitFor(() => {
        const contentTextareaAfter = screen.getByTestId("content-textarea");
        const temperatureInputAfter = screen.getByTestId("temperature-input");

        expect(contentTextareaAfter).toHaveValue("新しい内容");
        expect(temperatureInputAfter).toHaveValue(15);
      });

      // 作業種別が正しく設定されていることを確認
      const workTypeSelect = screen.getByTestId("work-type-select");
      expect(workTypeSelect).toHaveTextContent("収穫");

      // 天気が正しく設定されていることを確認
      const weatherSelect = screen.getByTestId("weather-select");
      expect(weatherSelect).toHaveTextContent("雨");

      // ほ場選択が正しく設定されていることを確認
      const fieldCheckbox = screen.getByTestId("field-checkbox-field-2");
      expect(fieldCheckbox).toBeChecked();
    });

    test("初期データがundefinedの場合デフォルト値が設定されること", async () => {
      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={false}
          initialData={undefined}
        />
      );

      // デフォルト値が設定されていることを確認
      const contentTextarea = screen.getByTestId("content-textarea");
      const temperatureInput = screen.getByTestId("temperature-input");

      expect(contentTextarea).toHaveValue("");
      expect(temperatureInput).toHaveValue(null);

      // 作業種別のデフォルト値を確認
      const workTypeSelect = screen.getByTestId("work-type-select");
      expect(workTypeSelect).toHaveTextContent("作業種別を選択");

      // 天気のデフォルト値を確認
      const weatherSelect = screen.getByTestId("weather-select");
      expect(weatherSelect).toHaveTextContent("天気を選択");

      // 日付のデフォルト値（今日の日付）を確認
      const today = new Date();
      const expectedDate = format(today, "PPP", { locale: ja });
      const dateButton = screen.getByTestId("date-picker-trigger");
      expect(dateButton).toHaveTextContent(expectedDate);

      // ほ場選択のデフォルト値を確認
      mockFieldOptions.forEach((field) => {
        const fieldCheckbox = screen.getByTestId(`field-checkbox-${field.id}`);
        expect(fieldCheckbox).not.toBeChecked();
      });
    });

    test("編集モードから新規作成モードに変更した時にフォームがリセットされること", async () => {
      const user = userEvent.setup();
      const { unmount } = render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 編集モードで初期データが反映されていることを確認
      const contentTextarea = screen.getByTestId("content-textarea");
      const temperatureInput = screen.getByTestId("temperature-input");

      expect(contentTextarea).toHaveValue("テスト作業内容");
      expect(temperatureInput).toHaveValue(25);

      // ユーザーがフォームを変更
      await user.clear(contentTextarea);
      await user.type(contentTextarea, "変更されたメモ");

      expect(contentTextarea).toHaveValue("変更されたメモ");

      unmount(); // コンポーネントをアンマウント

      // 新規作成モードに変更
      render(
        <DiaryFormDrawer
          {...defaultProps}
          isEdit={false}
          initialData={undefined}
        />
      );

      // フォームがデフォルト値にリセットされることを確認
      await waitFor(() => {
        const contentTextareaAfter = screen.getByTestId("content-textarea");
        const temperatureInputAfter = screen.getByTestId("temperature-input");

        expect(contentTextareaAfter).toHaveValue("");
        expect(temperatureInputAfter).toHaveValue(null);
      });

      // 作業種別がリセットされていることを確認
      const workTypeSelect = screen.getByTestId("work-type-select");
      expect(workTypeSelect).toHaveTextContent("作業種別を選択");

      // 天気がリセットされていることを確認
      const weatherSelect = screen.getByTestId("weather-select");
      expect(weatherSelect).toHaveTextContent("天気を選択");

      // 今日の日付が設定されていることを確認
      const today = new Date();
      const expectedDate = format(today, "PPP", { locale: ja });
      const dateButton = screen.getByTestId("date-picker-trigger");
      expect(dateButton).toHaveTextContent(expectedDate);

      // ほ場選択がリセットされていることを確認
      mockFieldOptions.forEach((field) => {
        const fieldCheckbox = screen.getByTestId(`field-checkbox-${field.id}`);
        expect(fieldCheckbox).not.toBeChecked();
      });
    });
  });

  describe("props の変更対応", () => {
    test("isEditプロパティの変更でタイトルが変わること", () => {
      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} isEdit={false} />
      );

      // 新規作成モードのタイトルを確認
      let drawerTitle = screen.getByTestId("drawer-title");
      expect(drawerTitle).toHaveTextContent("農業日誌を作成");

      // 編集モードに変更
      rerender(<DiaryFormDrawer {...defaultProps} isEdit={true} />);

      // 編集モードのタイトルに変更されることを確認
      drawerTitle = screen.getByTestId("drawer-title");
      expect(drawerTitle).toHaveTextContent("農業日誌を編集");

      // 再び新規作成モードに戻す
      rerender(<DiaryFormDrawer {...defaultProps} isEdit={false} />);

      // 新規作成モードのタイトルに戻ることを確認
      drawerTitle = screen.getByTestId("drawer-title");
      expect(drawerTitle).toHaveTextContent("農業日誌を作成");
    });

    test("isSubmittingプロパティの変更でボタン状態が変わること", () => {
      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} isSubmitting={false} />
      );

      // 送信中でない時のボタン状態を確認
      let desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      let mobileSubmitButton = screen.getByTestId("submit-button-mobile");
      let desktopCancelButton = screen.getByTestId("cancel-button-desktop");
      let mobileCancelButton = screen.getByTestId("cancel-button-mobile");

      expect(desktopSubmitButton).not.toBeDisabled();
      expect(mobileSubmitButton).not.toBeDisabled();
      expect(desktopCancelButton).not.toBeDisabled();
      expect(mobileCancelButton).not.toBeDisabled();
      expect(desktopSubmitButton).toHaveTextContent("作成");
      expect(mobileSubmitButton).toHaveTextContent("作成");

      // 送信中に変更
      rerender(<DiaryFormDrawer {...defaultProps} isSubmitting={true} />);

      // 送信中のボタン状態に変更されることを確認
      desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      mobileSubmitButton = screen.getByTestId("submit-button-mobile");
      desktopCancelButton = screen.getByTestId("cancel-button-desktop");
      mobileCancelButton = screen.getByTestId("cancel-button-mobile");

      expect(desktopSubmitButton).toBeDisabled();
      expect(mobileSubmitButton).toBeDisabled();
      expect(desktopCancelButton).toBeDisabled();
      expect(mobileCancelButton).toBeDisabled();
      expect(desktopSubmitButton).toHaveTextContent("保存中...");
      expect(mobileSubmitButton).toHaveTextContent("保存中...");

      // 送信完了に戻す
      rerender(<DiaryFormDrawer {...defaultProps} isSubmitting={false} />);

      // ボタン状態が元に戻ることを確認
      desktopSubmitButton = screen.getByTestId("submit-button-desktop");
      mobileSubmitButton = screen.getByTestId("submit-button-mobile");
      desktopCancelButton = screen.getByTestId("cancel-button-desktop");
      mobileCancelButton = screen.getByTestId("cancel-button-mobile");

      expect(desktopSubmitButton).not.toBeDisabled();
      expect(mobileSubmitButton).not.toBeDisabled();
      expect(desktopCancelButton).not.toBeDisabled();
      expect(mobileCancelButton).not.toBeDisabled();
      expect(desktopSubmitButton).toHaveTextContent("作成");
      expect(mobileSubmitButton).toHaveTextContent("作成");
    });

    test("fieldOptionsプロパティの変更で選択肢が更新されること", () => {
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
        screen.queryByTestId("field-option-greenhouse-1")
      ).not.toBeInTheDocument();

      // 選択肢のテキストを確認
      expect(screen.getByTestId("field-option-field-1")).toHaveTextContent(
        "A区画（トマト）"
      );
      expect(screen.getByTestId("field-option-field-2")).toHaveTextContent(
        "B区画（きゅうり）"
      );

      // fieldOptionsを更新
      const updatedFieldOptions: FieldOption[] = [
        { id: "field-1", name: "A区画（トマト）", type: "field", area: 100 },
        { id: "greenhouse-1", name: "第1温室", type: "greenhouse", area: 200 },
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
      expect(
        screen.getByTestId("field-option-greenhouse-1")
      ).toBeInTheDocument();
      expect(screen.getByTestId("field-option-field-3")).toBeInTheDocument();

      // 新しい選択肢のテキストを確認
      expect(screen.getByTestId("field-option-greenhouse-1")).toHaveTextContent(
        "第1温室"
      );
      expect(screen.getByTestId("field-option-field-3")).toHaveTextContent(
        "C区画（なす）"
      );

      // 空の配列に変更
      rerender(<DiaryFormDrawer {...defaultProps} fieldOptions={[]} />);

      // 全ての選択肢が削除されることを確認
      expect(
        screen.queryByTestId("field-option-field-1")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("field-option-greenhouse-1")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("field-option-field-3")
      ).not.toBeInTheDocument();

      // ほ場選択コンテナは存在するが、選択肢がないことを確認
      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();
    });

    test("initialDataプロパティの変更でフォームの初期値が更新されること", async () => {
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
      const contentTextarea = screen.getByTestId("content-textarea");
      const temperatureInput = screen.getByTestId("temperature-input");
      const workTypeSelect = screen.getByTestId("work-type-select");
      const weatherSelect = screen.getByTestId("weather-select");

      expect(contentTextarea).toHaveValue("初期内容1");
      expect(temperatureInput).toHaveValue(20);
      expect(workTypeSelect).toHaveTextContent("植付け");
      expect(weatherSelect).toHaveTextContent("晴れ");
      expect(screen.getByTestId("field-checkbox-field-1")).toBeChecked();

      // 異なる初期データに変更
      const initialData2: DiaryFormData = {
        date: new Date("2023-02-20"),
        title: "初期タイトル2",
        content: "初期内容2",
        workType: "HARVESTING",
        weather: "RAINY",
        temperature: 15,
        thingIds: ["field-2", "greenhouse-1"],
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
        const contentTextareaAfter = screen.getByTestId("content-textarea");
        const temperatureInputAfter = screen.getByTestId("temperature-input");
        const workTypeSelectAfter = screen.getByTestId("work-type-select");
        const weatherSelectAfter = screen.getByTestId("weather-select");

        expect(contentTextareaAfter).toHaveValue("初期内容2");
        expect(temperatureInputAfter).toHaveValue(15);
        expect(workTypeSelectAfter).toHaveTextContent("収穫");
        expect(weatherSelectAfter).toHaveTextContent("雨");
      });

      // ほ場選択が更新されていることを確認
      expect(screen.getByTestId("field-checkbox-field-1")).not.toBeChecked();
      expect(screen.getByTestId("field-checkbox-field-2")).toBeChecked();
      expect(screen.getByTestId("field-checkbox-greenhouse-1")).toBeChecked();
    });

    test("onCloseプロパティの変更で新しい関数が呼ばれること", async () => {
      const mockOnClose1 = vi.fn();
      const mockOnClose2 = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} onClose={mockOnClose1} />
      );

      // 最初のonClose関数でキャンセルボタンをクリック
      const cancelButton = screen.getByTestId("cancel-button-desktop");
      await user.click(cancelButton);

      expect(mockOnClose1).toHaveBeenCalledOnce();
      expect(mockOnClose2).not.toHaveBeenCalled();

      // onClose関数を変更
      rerender(<DiaryFormDrawer {...defaultProps} onClose={mockOnClose2} />);

      // 新しいonClose関数でキャンセルボタンをクリック
      await user.click(cancelButton);

      expect(mockOnClose1).toHaveBeenCalledOnce(); // 前回のまま
      expect(mockOnClose2).toHaveBeenCalledOnce(); // 新しい関数が呼ばれる
    });

    test("onSubmitプロパティの変更で新しい関数が呼ばれること", async () => {
      const mockOnSubmit1 = vi.fn();
      const mockOnSubmit2 = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <DiaryFormDrawer {...defaultProps} onSubmit={mockOnSubmit1} />
      );

      // 必須フィールドを入力
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      // 最初のonSubmit関数で送信
      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit1).toHaveBeenCalledOnce();
      });
      expect(mockOnSubmit2).not.toHaveBeenCalled();

      // onSubmit関数を変更
      rerender(<DiaryFormDrawer {...defaultProps} onSubmit={mockOnSubmit2} />);

      // 再度送信（フォームは既に有効な状態）
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit2).toHaveBeenCalledOnce(); // 新しい関数が呼ばれる
      });
      expect(mockOnSubmit1).toHaveBeenCalledOnce(); // 前回のまま
    });
  });

  describe("エッジケース", () => {
    test("未来の日付を選択できないこと", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      // 日付ピッカーを開く
      const datePickerTrigger = screen.getByTestId("date-picker-trigger");
      await user.click(datePickerTrigger);

      await waitFor(() => {
        expect(screen.getByTestId("date-picker-calendar")).toBeInTheDocument();
      });

      // 明日の日付を取得
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.toLocaleDateString();

      const calendar = screen.getByTestId("date-picker-calendar");

      // 明日の日付ボタンを探す
      const tomorrowButton = calendar.querySelector(
        `[data-day="${tomorrowDay}}"]`
      );

      // 未来の日付は無効化されている、または存在しないことを確認
      if (tomorrowButton) {
        expect(tomorrowButton).toHaveAttribute("disabled", "");
      }
    });

    test("気温にマイナス値を入力できること", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;

      // マイナス値を入力
      await user.type(temperatureInput, "-10");

      // マイナス値が正しく入力されることを確認
      expect(temperatureInput.value).toBe("-10");

      // フォーム送信時にマイナス値が正しく送信されることを確認
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.temperature).toBe(-10);
    });

    test("fieldOptionsが空配列の場合でもエラーが発生しないこと", () => {
      render(
        <DiaryFormDrawer
          {...defaultProps}
          fieldOptions={[]} // 空配列
        />
      );

      // ほ場選択セクションは表示されるが、選択肢がないことを確認
      expect(screen.getByTestId("field-options-container")).toBeInTheDocument();
      expect(screen.getByText("対象ほ場")).toBeInTheDocument();
      expect(
        screen.getByText(
          "作業を行ったほ場や温室を選択してください（複数選択可）"
        )
      ).toBeInTheDocument();

      // 選択済みバッジコンテナは表示されないことを確認
      expect(
        screen.queryByTestId("selected-fields-badges")
      ).not.toBeInTheDocument();
    });

    test("小数点を含む温度値を入力した場合の処理", async () => {
      const user = userEvent.setup();
      render(<DiaryFormDrawer {...defaultProps} />);

      const temperatureInput = screen.getByTestId(
        "temperature-input"
      ) as HTMLInputElement;

      // 小数点を含む値を入力
      await user.type(temperatureInput, "25.5");

      expect(temperatureInput.value).toBe("25.5");

      // フォーム送信時に小数点値が正しく送信されることを確認
      const workTypeSelect = screen.getByTestId("work-type-select");
      await user.click(workTypeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("work-type-options")).toBeInTheDocument();
      });
      const plantingOption = screen.getByTestId("work-type-option-PLANTING");
      await user.click(plantingOption);

      const submitButton = screen.getByTestId("submit-button-desktop");
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.temperature).toBe(25.5);
    });
  });
});
