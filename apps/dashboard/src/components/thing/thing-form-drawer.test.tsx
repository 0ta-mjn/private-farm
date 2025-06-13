import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, beforeEach, expect, test } from "vitest";
import { ThingFormDrawer, type ThingFormData } from "./thing-form-drawer";

// モックデータ
const mockInitialData: ThingFormData = {
  name: "テスト区画",
  type: "FIELD",
  description: "テスト用の説明",
  location: "北側圃場",
  area: "100",
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
};

describe("ThingFormDrawer", () => {
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
        <ThingFormDrawer {...defaultProps} isEdit={false} />
      );

      // 基本要素が表示されること（デスクトップまたはモバイル）
      const dialogElement = screen.queryByTestId("thing-form-dialog");
      const drawerElement = screen.queryByTestId("thing-form-drawer");
      expect(dialogElement || drawerElement).toBeInTheDocument();
      expect(screen.getByTestId("thing-form")).toBeInTheDocument();
      expect(screen.getByTestId("name-input")).toBeInTheDocument();
      expect(screen.getByTestId("type-select")).toBeInTheDocument();
      expect(screen.getByTestId("location-input")).toBeInTheDocument();
      expect(screen.getByTestId("area-input")).toBeInTheDocument();
      expect(screen.getByTestId("description-textarea")).toBeInTheDocument();

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
        <ThingFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 初期データが正しく表示されること
      const nameInput = screen.getByTestId("name-input") as HTMLInputElement;
      const locationInput = screen.getByTestId(
        "location-input"
      ) as HTMLInputElement;
      const areaInput = screen.getByTestId("area-input") as HTMLInputElement;
      const descriptionTextarea = screen.getByTestId(
        "description-textarea"
      ) as HTMLTextAreaElement;

      expect(nameInput.value).toBe("テスト区画");
      expect(locationInput.value).toBe("北側圃場");
      expect(areaInput.value).toBe("100");
      expect(descriptionTextarea.value).toBe("テスト用の説明");
      expect(screen.getByTestId("type-select")).toHaveTextContent("畑（露地）");
    });

    test("種類オプションの表示", async () => {
      const user = userEvent.setup();
      render(<ThingFormDrawer {...defaultProps} />);

      // 種類セレクトをクリック
      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);

      // 種類オプションが表示されること
      expect(screen.getByTestId("type-options")).toBeInTheDocument();
      expect(screen.getByTestId("type-option-FIELD")).toBeInTheDocument();
      expect(screen.getByTestId("type-option-HOUSE")).toBeInTheDocument();
    });
  });

  describe("フォーム操作", () => {
    test("全てのフィールドの操作", async () => {
      const user = userEvent.setup();
      render(<ThingFormDrawer {...defaultProps} />);

      // 区画名の入力
      const nameInput = screen.getByTestId("name-input") as HTMLInputElement;
      expect(nameInput.value).toBe("");
      await user.type(nameInput, "新しい区画");
      expect(nameInput.value).toBe("新しい区画");

      // 種類の選択
      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      expect(screen.getByTestId("type-options")).toBeInTheDocument();
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // 場所の入力
      const locationInput = screen.getByTestId(
        "location-input"
      ) as HTMLInputElement;
      expect(locationInput.value).toBe("");
      await user.type(locationInput, "南側圃場");
      expect(locationInput.value).toBe("南側圃場");

      // 面積の入力
      const areaInput = screen.getByTestId("area-input") as HTMLInputElement;
      expect(areaInput.value).toBe("");
      await user.type(areaInput, "150");
      expect(areaInput.value).toBe("150");

      // 小数点を含む値の入力
      await user.clear(areaInput);
      await user.type(areaInput, "150.5");
      expect(areaInput.value).toBe("150.5");

      // メモの入力
      const descriptionTextarea = screen.getByTestId(
        "description-textarea"
      ) as HTMLTextAreaElement;
      expect(descriptionTextarea.value).toBe("");
      const testDescription =
        "この区画は日当たりが良く、\nトマトの栽培に適しています。";
      await user.type(descriptionTextarea, testDescription);
      expect(descriptionTextarea.value).toBe(testDescription);
    });
  });

  describe("バリデーション", () => {
    test("必須・非必須フィールドのバリデーション", async () => {
      const user = userEvent.setup();
      render(<ThingFormDrawer {...defaultProps} />);

      // デスクトップまたはモバイルの送信ボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      // 必須フィールド未入力で送信
      await user.click(submitButton);

      // 必須フィールドエラーが表示され、送信されないこと
      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("type-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();

      // 必須フィールドのみ入力
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, "テスト区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // 非必須フィールドは空のまま送信
      await user.click(submitButton);

      // 非必須フィールドのエラーが表示されないこと
      expect(screen.queryByTestId("location-error")).not.toBeInTheDocument();
      expect(screen.queryByTestId("area-error")).not.toBeInTheDocument();
      expect(screen.queryByTestId("description-error")).not.toBeInTheDocument();

      // 送信が成功すること
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    test("面積の数値バリデーション", async () => {
      const user = userEvent.setup();
      render(<ThingFormDrawer {...defaultProps} />);

      const areaInput = screen.getByTestId("area-input") as HTMLInputElement;

      // 数値以外の文字を入力（inputのtype="number"により制限される）
      await user.type(areaInput, "abc");
      expect(areaInput.value).toBe("");

      // 負の値の入力
      await user.type(areaInput, "-10");
      expect(areaInput.value).toBe("-10");

      // 必須フィールドを入力して送信
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, "テスト区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // デスクトップまたはモバイルの送信ボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      await user.click(submitButton);

      // 負の値のエラーが表示されること
      await waitFor(() => {
        expect(screen.getByTestId("area-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();

      // 正の値に修正
      await user.clear(areaInput);
      await user.type(areaInput, "100");
      await user.click(submitButton);

      // エラーが解消され、送信成功
      expect(screen.queryByTestId("area-error")).not.toBeInTheDocument();
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });
    });

    test("文字数制限のバリデーション", async () => {
      const user = userEvent.setup();
      render(<ThingFormDrawer {...defaultProps} />);

      // 区画名の文字数制限テスト（255文字超過）
      const longName = "a".repeat(256);
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, longName);

      // メモの文字数制限テスト（1000文字超過）
      const longDescription = "a".repeat(1001);
      const descriptionTextarea = screen.getByTestId("description-textarea");
      await user.type(descriptionTextarea, longDescription);

      // 場所の文字数制限テスト（255文字超過）
      const longLocation = "a".repeat(256);
      const locationInput = screen.getByTestId("location-input");
      await user.type(locationInput, longLocation);

      // 種類を選択
      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // 送信
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const submitButton = desktopSubmitButton || mobileSubmitButton;

      if (!submitButton) {
        throw new Error("送信ボタンが見つかりません");
      }

      await user.click(submitButton);

      // 文字数制限エラーが表示されること
      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("description-error")).toBeInTheDocument();
        expect(screen.getByTestId("location-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("フォーム送信", () => {
    test("新規作成での送信", async () => {
      const user = userEvent.setup();
      render(<ThingFormDrawer {...defaultProps} isEdit={false} />);

      // 全フィールドを入力
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, "新しい区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      const locationInput = screen.getByTestId("location-input");
      await user.type(locationInput, "南側圃場");

      const areaInput = screen.getByTestId("area-input");
      await user.type(areaInput, "150");

      const descriptionTextarea = screen.getByTestId("description-textarea");
      await user.type(descriptionTextarea, "テスト用の区画です");

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
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      const submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData).toBeDefined();
      expect(submittedData).toHaveProperty("name", "新しい区画");
      expect(submittedData).toHaveProperty("type", "FIELD");
      expect(submittedData).toHaveProperty("location", "南側圃場");
      expect(submittedData).toHaveProperty("area", "150");
      expect(submittedData).toHaveProperty("description", "テスト用の区画です");
    });

    test("編集モードでの送信と初期データ保持", async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ThingFormDrawer
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
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      let submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.name).toBe(mockInitialData.name);
      expect(submittedData?.type).toBe(mockInitialData.type);
      expect(submittedData?.location).toBe(mockInitialData.location);
      expect(submittedData?.area).toBe(mockInitialData.area);
      expect(submittedData?.description).toBe(mockInitialData.description);

      // リセット
      vi.clearAllMocks();

      // 再レンダリングして全データを変更
      rerender(
        <ThingFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={mockInitialData}
        />
      );

      // 全項目を変更
      const nameInput = screen.getByTestId("name-input") as HTMLInputElement;
      await user.click(nameInput);
      nameInput.value = "";
      await user.type(nameInput, "更新された区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const houseOption = screen.getByTestId("type-option-HOUSE");
      await user.click(houseOption);

      const locationInput = screen.getByTestId(
        "location-input"
      ) as HTMLInputElement;
      await user.click(locationInput);
      locationInput.value = "";
      await user.type(locationInput, "東側圃場");

      const areaInput = screen.getByTestId("area-input") as HTMLInputElement;
      await user.click(areaInput);
      areaInput.value = "";
      await user.type(areaInput, "200");

      const descriptionTextarea = screen.getByTestId(
        "description-textarea"
      ) as HTMLTextAreaElement;
      await user.click(descriptionTextarea);
      descriptionTextarea.value = "";
      await user.type(descriptionTextarea, "更新された説明");

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
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      submittedData = defaultProps.onSubmit.mock.calls[0]?.[0];
      expect(submittedData?.name).toBe("更新された区画");
      expect(submittedData?.type).toBe("HOUSE");
      expect(submittedData?.location).toBe("東側圃場");
      expect(submittedData?.area).toBe("200");
      expect(submittedData?.description).toBe("更新された説明");
    });

    test("フォーム直接送信とバリデーションエラー時の送信防止", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<ThingFormDrawer {...defaultProps} />);

      // 必須フィールドを入力
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, "テスト区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // フォーム直接送信（Enterキーでの送信をシミュレート）
      const form = screen.getByTestId("thing-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled();
      });

      // 前のコンポーネントをアンマウントしてからリセット
      unmount();
      vi.clearAllMocks();

      // バリデーションエラーがある場合の送信防止
      render(<ThingFormDrawer {...defaultProps} />);

      // 必須フィールドを入力せずに送信
      const submitButton =
        screen.getByTestId("submit-button-desktop") ||
        screen.getByTestId("submit-button-mobile");
      await user.click(submitButton);

      // バリデーションエラーが表示され、送信されない
      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("type-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("ドロワー操作とUI状態", () => {
    test("キャンセルボタンの動作", async () => {
      const mockOnClose = vi.fn();
      const user = userEvent.setup();

      render(<ThingFormDrawer {...defaultProps} onClose={mockOnClose} />);

      // デスクトップまたはモバイルのキャンセルボタンを確認
      const desktopCancelButton = screen.queryByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.queryByTestId("cancel-button-mobile");

      // 存在するキャンセルボタンをクリック
      if (desktopCancelButton) {
        await user.click(desktopCancelButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      } else if (mobileCancelButton) {
        await user.click(mobileCancelButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      } else {
        throw new Error("キャンセルボタンが見つかりません");
      }
    });

    test("送信状態での UI 変更", () => {
      // 送信中状態
      const { rerender } = render(
        <ThingFormDrawer {...defaultProps} isSubmitting={true} />
      );

      // 表示されているボタンを取得
      const desktopSubmitButton = screen.queryByTestId("submit-button-desktop");
      const mobileSubmitButton = screen.queryByTestId("submit-button-mobile");
      const desktopCancelButton = screen.queryByTestId("cancel-button-desktop");
      const mobileCancelButton = screen.queryByTestId("cancel-button-mobile");

      // 表示されているボタンが無効化されること
      if (desktopSubmitButton) {
        expect(desktopSubmitButton).toBeDisabled();
      }
      if (mobileSubmitButton) {
        expect(mobileSubmitButton).toBeDisabled();
      }
      if (desktopCancelButton) {
        expect(desktopCancelButton).toBeDisabled();
      }
      if (mobileCancelButton) {
        expect(mobileCancelButton).toBeDisabled();
      }

      // フォームフィールドも無効化されること
      expect(screen.getByTestId("name-input")).toBeDisabled();
      expect(screen.getByTestId("type-select")).toBeDisabled();
      expect(screen.getByTestId("location-input")).toBeDisabled();
      expect(screen.getByTestId("area-input")).toBeDisabled();
      expect(screen.getByTestId("description-textarea")).toBeDisabled();

      // 送信完了状態に変更
      rerender(<ThingFormDrawer {...defaultProps} isSubmitting={false} />);

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

      // フォームフィールドも有効になること
      expect(screen.getByTestId("name-input")).not.toBeDisabled();
      expect(screen.getByTestId("type-select")).not.toBeDisabled();
      expect(screen.getByTestId("location-input")).not.toBeDisabled();
      expect(screen.getByTestId("area-input")).not.toBeDisabled();
      expect(screen.getByTestId("description-textarea")).not.toBeDisabled();
    });

    test("新規作成・編集モードでのタイトルとボタンテキスト変更", () => {
      // 新規作成モード
      const { rerender } = render(
        <ThingFormDrawer {...defaultProps} isEdit={false} />
      );

      // タイトルの確認
      const title = screen.queryByText("区画を作成");
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
      rerender(<ThingFormDrawer {...defaultProps} isEdit={true} />);

      // タイトルの確認
      const editTitle = screen.queryByText("区画を編集");
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
      render(<ThingFormDrawer {...defaultProps} />);

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
      const initialData1: ThingFormData = {
        name: "初期区画1",
        type: "FIELD",
        description: "初期説明1",
        location: "初期場所1",
        area: "100",
      };

      const { rerender } = render(
        <ThingFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={initialData1}
        />
      );

      // 初期データ1が反映されていることを確認
      expect(screen.getByTestId("name-input")).toHaveValue("初期区画1");
      expect(screen.getByTestId("description-textarea")).toHaveValue(
        "初期説明1"
      );
      expect(screen.getByTestId("location-input")).toHaveValue("初期場所1");
      expect(screen.getByTestId("area-input")).toHaveValue(100);
      expect(screen.getByTestId("type-select")).toHaveTextContent("畑");

      // 異なる初期データに変更
      const initialData2: ThingFormData = {
        name: "初期区画2",
        type: "HOUSE",
        description: "初期説明2",
        location: "初期場所2",
        area: "200",
      };

      rerender(
        <ThingFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={initialData2}
        />
      );

      // 新しい初期データが反映されることを確認
      await waitFor(() => {
        expect(screen.getByTestId("name-input")).toHaveValue("初期区画2");
        expect(screen.getByTestId("description-textarea")).toHaveValue(
          "初期説明2"
        );
        expect(screen.getByTestId("location-input")).toHaveValue("初期場所2");
        expect(screen.getByTestId("area-input")).toHaveValue(200);
        expect(screen.getByTestId("type-select")).toHaveTextContent("温室");
      });

      // undefinedの場合のデフォルト値設定
      rerender(
        <ThingFormDrawer
          {...defaultProps}
          isEdit={false}
          initialData={undefined}
        />
      );

      expect(screen.getByTestId("name-input")).toHaveValue("");
      expect(screen.getByTestId("description-textarea")).toHaveValue("");
      expect(screen.getByTestId("location-input")).toHaveValue("");
      expect(screen.getByTestId("area-input")).toHaveValue(null);
      expect(screen.getByTestId("type-select")).toHaveTextContent(
        "区画の種類を選択"
      );
    });

    test("コールバック関数の変更", async () => {
      const user = userEvent.setup();
      const mockOnSubmit1 = vi.fn();
      const mockOnClose1 = vi.fn();

      const { rerender } = render(
        <ThingFormDrawer
          {...defaultProps}
          onSubmit={mockOnSubmit1}
          onClose={mockOnClose1}
        />
      );

      // 必須フィールドを入力
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, "テスト区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // 送信
      const submitButton =
        screen.getByTestId("submit-button-desktop") ||
        screen.getByTestId("submit-button-mobile");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit1).toHaveBeenCalled();
      });

      // コールバック関数を変更
      const mockOnSubmit2 = vi.fn();
      const mockOnClose2 = vi.fn();

      rerender(
        <ThingFormDrawer
          {...defaultProps}
          onSubmit={mockOnSubmit2}
          onClose={mockOnClose2}
        />
      );

      // 新しいコールバックが呼ばれることを確認
      const cancelButton =
        screen.getByTestId("cancel-button-desktop") ||
        screen.getByTestId("cancel-button-mobile");
      await user.click(cancelButton);

      expect(mockOnClose2).toHaveBeenCalled();
      expect(mockOnClose1).not.toHaveBeenCalled();
    });

    test("エッジケースの処理", async () => {
      const user = userEvent.setup();

      // 空文字列の初期データ
      const emptyInitialData: ThingFormData = {
        name: "",
        type: "",
        description: "",
        location: "",
        area: "",
      };

      render(
        <ThingFormDrawer
          {...defaultProps}
          isEdit={true}
          initialData={emptyInitialData}
        />
      );

      // 空の初期データが正しく処理されること
      expect(screen.getByTestId("name-input")).toHaveValue("");
      expect(screen.getByTestId("description-textarea")).toHaveValue("");
      expect(screen.getByTestId("location-input")).toHaveValue("");
      expect(screen.getByTestId("area-input")).toHaveValue(null);
      expect(screen.getByTestId("type-select")).toHaveTextContent(
        "区画の種類を選択"
      );

      // 面積フィールドに0を入力
      const areaInput = screen.getByTestId("area-input");
      await user.type(areaInput, "0");

      // 必須フィールドを入力
      const nameInput = screen.getByTestId("name-input");
      await user.type(nameInput, "テスト区画");

      const typeSelect = screen.getByTestId("type-select");
      await user.click(typeSelect);
      await waitFor(() => {
        expect(screen.getByTestId("type-options")).toBeInTheDocument();
      });
      const fieldOption = screen.getByTestId("type-option-FIELD");
      await user.click(fieldOption);

      // 送信
      const submitButton =
        screen.getByTestId("submit-button-desktop") ||
        screen.getByTestId("submit-button-mobile");
      await user.click(submitButton);

      // 面積0のエラーが表示されること
      await waitFor(() => {
        expect(screen.getByTestId("area-error")).toBeInTheDocument();
      });
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });
  });
});
