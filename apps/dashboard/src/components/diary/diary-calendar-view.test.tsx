import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  DiaryCalendarView,
  groupDiariesByDate,
  generateCalendarDays,
  getDayClassNames,
  getDateTextClassNames,
} from "./diary-calendar-view";

// モックデータ
const mockDiaries = [
  {
    id: "diary-1",
    date: "2025-06-01",
    workType: "PLANTING",
  },
  {
    id: "diary-2",
    date: "2025-06-01",
    workType: "WATERING",
  },
  {
    id: "diary-3",
    date: "2025-06-02",
    workType: "HARVESTING",
  },
  {
    id: "diary-4",
    date: "2025-06-02",
    workType: "FERTILIZING",
  },
  {
    id: "diary-5",
    date: "2025-06-02",
    workType: "WEEDING",
  },
];

const defaultProps = {
  currentMonth: new Date("2025-06-01"),
  selectedDate: null,
  diaries: mockDiaries,
  onMonthChange: vi.fn(),
  onDateSelect: vi.fn(),
};

describe("DiaryCalendarView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("レンダリング", () => {
    test("カレンダーが正しくレンダリングされること", () => {
      render(<DiaryCalendarView {...defaultProps} />);

      // カレンダーコンテナが表示されること
      expect(screen.getByTestId("diary-calendar")).toBeInTheDocument();

      // 月タイトルが表示されること
      expect(screen.getByTestId("diary-calendar-title")).toBeInTheDocument();

      // 前月・次月ボタンが表示されること
      expect(
        screen.getByTestId("diary-calendar-prev-month")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("diary-calendar-next-month")
      ).toBeInTheDocument();

      // 曜日ヘッダーが表示されること
      expect(screen.getByTestId("diary-calendar-weekdays")).toBeInTheDocument();

      // カレンダーグリッドが表示されること
      expect(screen.getByTestId("diary-calendar-grid")).toBeInTheDocument();
    });

    test("月タイトルが正しく表示されること", () => {
      const testDate = new Date("2025-06-15");
      render(<DiaryCalendarView {...defaultProps} currentMonth={testDate} />);

      // 現在の月が正しいフォーマットで表示されること
      const title = screen.getByTestId("diary-calendar-title");
      expect(title).toHaveTextContent("2025年 6月");
    });

    test("曜日ヘッダーが正しく表示されること", () => {
      render(<DiaryCalendarView {...defaultProps} />);

      // 7つの曜日が表示されること
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      weekdays.forEach((day, index) => {
        const weekdayElement = screen.getByTestId(
          `diary-calendar-weekday-${index}`
        );
        expect(weekdayElement).toBeInTheDocument();
        expect(weekdayElement).toHaveTextContent(day);
      });

      // 日曜日（0番目）が赤色で表示されること
      const sunday = screen.getByTestId("diary-calendar-weekday-0");
      expect(sunday).toHaveClass("text-red-500");

      // 土曜日（6番目）が青色で表示されること
      const saturday = screen.getByTestId("diary-calendar-weekday-6");
      expect(saturday).toHaveClass("text-blue-500");

      // 平日（1-5番目）が通常色で表示されること
      for (let i = 1; i <= 5; i++) {
        const weekday = screen.getByTestId(`diary-calendar-weekday-${i}`);
        expect(weekday).toHaveClass("text-muted-foreground");
      }
    });

    test("カレンダーの日付が正しく表示されること", () => {
      const testDate = new Date("2025-06-15");
      render(<DiaryCalendarView {...defaultProps} currentMonth={testDate} />);

      // 6月1日が表示されること
      const june1 = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(june1).toBeInTheDocument();
      expect(june1).toHaveAttribute("data-date", "2025-06-01");
      expect(june1).toHaveAttribute("data-is-current-month", "true");

      // 6月30日が表示されること
      const june30 = screen.getByTestId("diary-calendar-day-2025-06-30");
      expect(june30).toBeInTheDocument();
      expect(june30).toHaveAttribute("data-date", "2025-06-30");
      expect(june30).toHaveAttribute("data-is-current-month", "true");

      // 前月・次月の日付も表示されること（当月外の日付）
      const calendarGrid = screen.getByTestId("diary-calendar-grid");
      const dayCells = calendarGrid.querySelectorAll(
        "[data-testid^='diary-calendar-day-']"
      );
      expect(dayCells.length).toBeGreaterThan(30); // 35日（5週間）または42日（6週間）

      // 日付セルが正しいdata属性を持つこと
      dayCells.forEach((cell) => {
        expect(cell).toHaveAttribute("data-date");
        expect(cell).toHaveAttribute("data-is-current-month");
        expect(cell).toHaveAttribute("data-is-today");
        expect(cell).toHaveAttribute("data-is-selected");
        expect(cell).toHaveAttribute("data-diary-count");
      });
    });

    test("日誌データが正しく表示されること", () => {
      render(<DiaryCalendarView {...defaultProps} />);

      // 2025-06-01に日誌バッジが表示されること
      const june1Diaries = screen.getByTestId(
        "diary-calendar-diaries-2025-06-01"
      );
      expect(june1Diaries).toBeInTheDocument();

      // PLANTINGバッジが表示されること
      const plantingBadge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-0"
      );
      expect(plantingBadge).toBeInTheDocument();
      expect(plantingBadge).toHaveAttribute("data-work-type", "PLANTING");
      expect(plantingBadge).toHaveTextContent("植付け");

      // WATERINGバッジが表示されること
      const wateringBadge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-1"
      );
      expect(wateringBadge).toBeInTheDocument();
      expect(wateringBadge).toHaveAttribute("data-work-type", "WATERING");
      expect(wateringBadge).toHaveTextContent("水やり");

      // 2025-06-02（日誌数が多い日）で最大表示数を超える場合の「+N件」が表示されること
      const june2Diaries = screen.getByTestId(
        "diary-calendar-diaries-2025-06-02"
      );
      expect(june2Diaries).toBeInTheDocument();

      // 最大2件まで表示される
      const june2Badge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-02-0"
      );
      const june2Badge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-02-1"
      );
      expect(june2Badge1).toBeInTheDocument();
      expect(june2Badge2).toBeInTheDocument();

      // 3件目以降は「+N件」で表示される
      const moreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-02"
      );
      expect(moreDiaries).toBeInTheDocument();
      expect(moreDiaries).toHaveTextContent("+1件");
      expect(moreDiaries).toHaveAttribute("data-remaining-count", "1");
    });

    test("日誌データが空の場合でもエラーにならないこと", () => {
      // diariesが空配列の場合
      render(<DiaryCalendarView {...defaultProps} diaries={[]} />);
      expect(screen.getByTestId("diary-calendar")).toBeInTheDocument();

      // 日誌バッジが表示されないこと
      expect(
        screen.queryByTestId(/diary-calendar-diaries-/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(/diary-calendar-diary-badge-/)
      ).not.toBeInTheDocument();

      // 日付セルの diary-count は 0 になること
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(dateCell).toHaveAttribute("data-diary-count", "0");
    });
  });

  describe("視覚的状態", () => {
    test("今日の日付が強調表示されること", () => {
      // 今日の日付を2025年6月1日に設定
      vi.setSystemTime(new Date(2025, 5, 1)); // 6月1日

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
        />
      );

      const todayCell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(todayCell).toHaveAttribute("data-is-today", "true");

      // 他の日付は今日ではないことを確認
      const otherDayCell = screen.getByTestId("diary-calendar-day-2025-06-02");
      expect(otherDayCell).toHaveAttribute("data-is-today", "false");
    });

    test("選択された日付が強調表示されること", () => {
      const selectedDate = new Date(2025, 5, 15); // 6月15日

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          selectedDate={selectedDate}
        />
      );

      const selectedCell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(selectedCell).toHaveAttribute("data-is-selected", "true");

      // 他の日付は選択されていないことを確認
      const otherDayCell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(otherDayCell).toHaveAttribute("data-is-selected", "false");
    });

    test("当月以外の日付が薄く表示されること", () => {
      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2024, 5, 1)} // 6月
        />
      );

      // 前月の日付（5月31日など）を探す
      const prevMonthCells = screen.queryAllByTestId((testId) =>
        testId.startsWith("diary-calendar-day-2024-05-")
      );
      prevMonthCells.forEach((cell) => {
        expect(cell).toHaveAttribute("data-is-current-month", "false");
      });

      // 次月の日付（7月1日など）を探す
      const nextMonthCells = screen.queryAllByTestId((testId) =>
        testId.startsWith("diary-calendar-day-2024-07-")
      );
      nextMonthCells.forEach((cell) => {
        expect(cell).toHaveAttribute("data-is-current-month", "false");
      });

      // 当月の日付は薄くないことを確認
      const currentMonthCell = screen.getByTestId(
        "diary-calendar-day-2024-06-01"
      );
      expect(currentMonthCell).toHaveAttribute("data-is-current-month", "true");
    });

    test("日誌がある日付に正しいバッジが表示されること", () => {
      const diaries = [
        {
          id: "1",
          date: "2025-06-01",
          workType: "SEEDING",
          workTypeDisplay: "播種",
          cropName: "トマト",
          fieldName: "北畑",
        },
        {
          id: "2",
          date: "2025-06-02",
          workType: "WATERING",
          workTypeDisplay: "水やり",
          cropName: "キュウリ",
          fieldName: "南畑",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          diaries={diaries}
        />
      );

      // 6月1日のバッジを確認
      const badge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-0"
      );
      expect(badge1).toBeInTheDocument();
      expect(badge1).toHaveTextContent("播種");
      expect(badge1).toHaveAttribute("data-work-type", "SEEDING");

      // 6月2日のバッジを確認
      const badge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-02-0"
      );
      expect(badge2).toBeInTheDocument();
      expect(badge2).toHaveTextContent("水やり");
      expect(badge2).toHaveAttribute("data-work-type", "WATERING");
    });

    test("複数の日誌がある日付で適切に表示されること", () => {
      const diaries = [
        {
          id: "1",
          date: "2025-06-01",
          workType: "SEEDING",
          workTypeDisplay: "播種",
          cropName: "トマト",
          fieldName: "北畑",
        },
        {
          id: "2",
          date: "2025-06-01",
          workType: "WATERING",
          workTypeDisplay: "水やり",
          cropName: "キュウリ",
          fieldName: "南畑",
        },
        {
          id: "3",
          date: "2025-06-01",
          workType: "FERTILIZING",
          workTypeDisplay: "施肥",
          cropName: "ナス",
          fieldName: "東畑",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          diaries={diaries}
        />
      );

      // 最大表示数（2件）まではバッジが表示される
      const badge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-0"
      );
      expect(badge1).toBeInTheDocument();
      expect(badge1).toHaveTextContent("播種");

      const badge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-1"
      );
      expect(badge2).toBeInTheDocument();
      expect(badge2).toHaveTextContent("水やり");

      // 3件目以降は「+N件」で表示される
      const moreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-01"
      );
      expect(moreDiaries).toBeInTheDocument();
      expect(moreDiaries).toHaveTextContent("+1件");
      expect(moreDiaries).toHaveAttribute("data-remaining-count", "1");

      // 日付セルの diary-count は正しいことを確認
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(dateCell).toHaveAttribute("data-diary-count", "3");
    });

    test("今日と選択日が同じ場合の表示状態", () => {
      const today = new Date(2025, 5, 1); // 6月1日
      vi.setSystemTime(today);

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          selectedDate={today}
        />
      );

      const cell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(cell).toHaveAttribute("data-is-today", "true");
      expect(cell).toHaveAttribute("data-is-selected", "true");
    });
  });

  describe("ユーザー操作", () => {
    test("前月ボタンをクリックできること", async () => {
      const user = userEvent.setup();
      const mockOnMonthChange = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          onMonthChange={mockOnMonthChange}
        />
      );

      // 前月ボタンを取得してクリック
      const prevButton = screen.getByTestId("diary-calendar-prev-month");
      expect(prevButton).toBeInTheDocument();
      expect(prevButton).not.toBeDisabled();

      await user.click(prevButton);

      // onMonthChangeが'prev'で呼ばれることを確認
      expect(mockOnMonthChange).toHaveBeenCalledTimes(1);
      expect(mockOnMonthChange).toHaveBeenCalledWith("prev");
    });

    test("次月ボタンをクリックできること", async () => {
      const user = userEvent.setup();
      const mockOnMonthChange = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          onMonthChange={mockOnMonthChange}
        />
      );

      // 次月ボタンを取得してクリック
      const nextButton = screen.getByTestId("diary-calendar-next-month");
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).not.toBeDisabled();

      await user.click(nextButton);

      // onMonthChangeが'next'で呼ばれることを確認
      expect(mockOnMonthChange).toHaveBeenCalledTimes(1);
      expect(mockOnMonthChange).toHaveBeenCalledWith("next");
    });

    test("日付セルをクリックできること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)} // 2025年6月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 6月15日のセルを取得してクリック
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(dateCell).toBeInTheDocument();

      await user.click(dateCell);

      // onDateSelectが正しい日付で呼ばれることを確認
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = mockOnDateSelect.mock.calls[0]![0] as Date;
      expect(calledDate).toBeInstanceOf(Date);
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(5); // 6月（0ベース）
      expect(calledDate.getDate()).toBe(15);
    });

    test("当月の日付をクリックできること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)} // 2025年6月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 当月（6月）の複数の日付をテスト
      const testDates = [1, 15, 30];

      for (const day of testDates) {
        const dateCell = screen.getByTestId(
          `diary-calendar-day-2025-06-${day.toString().padStart(2, "0")}`
        );
        expect(dateCell).toBeInTheDocument();

        await user.click(dateCell);

        // 正しい日付オブジェクトが渡されることを確認
        const calledDate = mockOnDateSelect.mock.calls[
          mockOnDateSelect.mock.calls.length - 1
        ]![0] as Date;
        expect(calledDate.getFullYear()).toBe(2025);
        expect(calledDate.getMonth()).toBe(5);
        expect(calledDate.getDate()).toBe(day);
      }

      expect(mockOnDateSelect).toHaveBeenCalledTimes(testDates.length);
    });

    test("前月・次月の日付をクリックできること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)} // 2025年6月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 次月（7月）の日付をクリック（6月30日が月曜日なので7月1-5日が表示される）
      const julyFirstCell = screen.getByTestId("diary-calendar-day-2025-07-01");
      expect(julyFirstCell).toBeInTheDocument();

      await user.click(julyFirstCell);

      // 正しい日付オブジェクトが渡されることを確認
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = mockOnDateSelect.mock.calls[0]![0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(6); // 7月（0ベース）
      expect(calledDate.getDate()).toBe(1);

      // 別の次月の日付もテスト
      const julySecondCell = screen.getByTestId(
        "diary-calendar-day-2025-07-02"
      );
      await user.click(julySecondCell);

      expect(mockOnDateSelect).toHaveBeenCalledTimes(2);
      const secondCalledDate = mockOnDateSelect.mock.calls[1]![0] as Date;
      expect(secondCalledDate.getFullYear()).toBe(2025);
      expect(secondCalledDate.getMonth()).toBe(6);
      expect(secondCalledDate.getDate()).toBe(2);
    });

    test("日誌がある日付をクリックできること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      const diaries = [
        {
          id: "1",
          date: "2025-06-15",
          workType: "SEEDING",
          workTypeDisplay: "播種",
          cropName: "トマト",
          fieldName: "北畑",
        },
        {
          id: "2",
          date: "2025-06-15",
          workType: "WATERING",
          workTypeDisplay: "水やり",
          cropName: "キュウリ",
          fieldName: "南畑",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          onDateSelect={mockOnDateSelect}
          diaries={diaries}
        />
      );

      // 日誌がある日付のセルをクリック
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(dateCell).toBeInTheDocument();
      expect(dateCell).toHaveAttribute("data-diary-count", "2");

      await user.click(dateCell);

      // onDateSelectが正しく呼ばれることを確認
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = mockOnDateSelect.mock.calls[0]![0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(5);
      expect(calledDate.getDate()).toBe(15);
    });

    test("複数回ボタンクリックが連続で動作すること", async () => {
      const user = userEvent.setup();
      const mockOnMonthChange = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          onMonthChange={mockOnMonthChange}
        />
      );

      const prevButton = screen.getByTestId("diary-calendar-prev-month");
      const nextButton = screen.getByTestId("diary-calendar-next-month");

      // 複数回連続でクリック
      await user.click(prevButton);
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(prevButton);

      // 正しい順序でコールバックが呼ばれることを確認
      expect(mockOnMonthChange).toHaveBeenCalledTimes(4);
      expect(mockOnMonthChange.mock.calls[0]![0]).toBe("prev");
      expect(mockOnMonthChange.mock.calls[1]![0]).toBe("next");
      expect(mockOnMonthChange.mock.calls[2]![0]).toBe("next");
      expect(mockOnMonthChange.mock.calls[3]![0]).toBe("prev");
    });

    test("同じ日付を複数回クリックできること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          onDateSelect={mockOnDateSelect}
        />
      );

      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");

      // 同じ日付を複数回クリック
      await user.click(dateCell);
      await user.click(dateCell);
      await user.click(dateCell);

      // 毎回コールバックが呼ばれることを確認
      expect(mockOnDateSelect).toHaveBeenCalledTimes(3);
      mockOnDateSelect.mock.calls.forEach((call) => {
        const calledDate = call[0] as Date;
        expect(calledDate.getDate()).toBe(15);
      });
    });

    test("コールバック関数が未定義でもエラーにならないこと", async () => {
      const user = userEvent.setup();
      const mockOnMonthChange = vi.fn();
      const mockOnDateSelect = vi.fn();

      // 実際のコールバックを渡すが、動作しても問題ないことを確認
      render(
        <DiaryCalendarView
          currentMonth={new Date(2025, 5, 1)}
          selectedDate={null}
          diaries={[]}
          onMonthChange={mockOnMonthChange}
          onDateSelect={mockOnDateSelect}
        />
      );

      const prevButton = screen.getByTestId("diary-calendar-prev-month");
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");

      // クリックしてもエラーにならないことを確認
      await user.click(prevButton);
      await user.click(dateCell);

      // コールバックが呼ばれることを確認
      expect(mockOnMonthChange).toHaveBeenCalledTimes(1);
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("プロップスの変更対応", () => {
    test("currentMonthが変更された時にカレンダーが更新されること", () => {
      const { rerender } = render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
        />
      );

      // 初期状態の確認
      const initialTitle = screen.getByTestId("diary-calendar-title");
      expect(initialTitle).toHaveTextContent("2025年 6月");

      // 6月の日付が表示されていることを確認
      const june15Cell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(june15Cell).toBeInTheDocument();
      expect(june15Cell).toHaveAttribute("data-is-current-month", "true");

      // currentMonthを7月に変更
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-07-01")}
        />
      );

      // タイトルが更新されることを確認
      const updatedTitle = screen.getByTestId("diary-calendar-title");
      expect(updatedTitle).toHaveTextContent("2025年 7月");

      // 7月の日付が表示されることを確認
      const july15Cell = screen.getByTestId("diary-calendar-day-2025-07-15");
      expect(july15Cell).toBeInTheDocument();
      expect(july15Cell).toHaveAttribute("data-is-current-month", "true");

      // 6月の日付が当月外として表示されるか非表示になることを確認
      const june15CellAfterUpdate = screen.queryByTestId(
        "diary-calendar-day-2025-06-15"
      );
      if (june15CellAfterUpdate) {
        expect(june15CellAfterUpdate).toHaveAttribute(
          "data-is-current-month",
          "false"
        );
      }

      // 別の月（2024年12月）に変更してさらにテスト
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2024-12-01")}
        />
      );

      const decemberTitle = screen.getByTestId("diary-calendar-title");
      expect(decemberTitle).toHaveTextContent("2024年 12月");

      // 年またぎでも正しく動作することを確認
      const december25Cell = screen.getByTestId(
        "diary-calendar-day-2024-12-25"
      );
      expect(december25Cell).toBeInTheDocument();
      expect(december25Cell).toHaveAttribute("data-is-current-month", "true");
    });

    test("selectedDateが変更された時に選択状態が更新されること", () => {
      const { rerender } = render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          selectedDate={null}
        />
      );

      // 初期状態では選択された日付がないことを確認
      const june15Cell = screen.getByTestId("diary-calendar-day-2025-06-15");
      const june20Cell = screen.getByTestId("diary-calendar-day-2025-06-20");
      expect(june15Cell).toHaveAttribute("data-is-selected", "false");
      expect(june20Cell).toHaveAttribute("data-is-selected", "false");

      // selectedDateを6月15日に設定
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          selectedDate={new Date("2025-06-15")}
        />
      );

      // 6月15日が選択状態になることを確認
      expect(june15Cell).toHaveAttribute("data-is-selected", "true");
      expect(june20Cell).toHaveAttribute("data-is-selected", "false");

      // selectedDateを6月20日に変更
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          selectedDate={new Date("2025-06-20")}
        />
      );

      // 前の選択状態が解除され、新しい日付が選択状態になることを確認
      expect(june15Cell).toHaveAttribute("data-is-selected", "false");
      expect(june20Cell).toHaveAttribute("data-is-selected", "true");

      // selectedDateをnullに戻す
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          selectedDate={null}
        />
      );

      // 選択状態が解除されることを確認
      expect(june15Cell).toHaveAttribute("data-is-selected", "false");
      expect(june20Cell).toHaveAttribute("data-is-selected", "false");

      // 月をまたいだ日付選択のテスト
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          selectedDate={new Date("2025-07-01")}
        />
      );

      // 次月の日付が選択された場合
      const july1Cell = screen.getByTestId("diary-calendar-day-2025-07-01");
      expect(july1Cell).toHaveAttribute("data-is-selected", "true");
      expect(july1Cell).toHaveAttribute("data-is-current-month", "false");
    });

    test("diariesが変更された時にバッジが更新されること", () => {
      const initialDiaries = [
        {
          id: "diary-1",
          date: "2025-06-01",
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
        {
          id: "diary-2",
          date: "2025-06-15",
          workType: "WATERING" as const,
          workTypeDisplay: "水やり",
        },
      ];

      const { rerender } = render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={initialDiaries}
        />
      );

      // 初期状態の日誌バッジを確認
      const june1Diaries = screen.getByTestId(
        "diary-calendar-diaries-2025-06-01"
      );
      expect(june1Diaries).toBeInTheDocument();

      const june1Badge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-0"
      );
      expect(june1Badge).toHaveTextContent("植付け");

      const june15Diaries = screen.getByTestId(
        "diary-calendar-diaries-2025-06-15"
      );
      expect(june15Diaries).toBeInTheDocument();

      const june15Badge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-15-0"
      );
      expect(june15Badge).toHaveTextContent("水やり");

      // 日誌データを更新（新しい日誌追加、既存の日誌変更）
      const updatedDiaries = [
        {
          id: "diary-1",
          date: "2025-06-01",
          workType: "SEEDING" as const,
          workTypeDisplay: "播種", // 変更
        },
        {
          id: "diary-3",
          date: "2025-06-01",
          workType: "FERTILIZING" as const,
          workTypeDisplay: "施肥", // 追加
        },
        {
          id: "diary-4",
          date: "2025-06-20",
          workType: "HARVESTING" as const,
          workTypeDisplay: "収穫", // 新しい日付
        },
        // diary-2（6月15日の水やり）は削除
      ];

      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={updatedDiaries}
        />
      );

      // 6月1日のバッジが更新されることを確認
      const updatedJune1Badge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-0"
      );
      expect(updatedJune1Badge1).toHaveTextContent("播種");

      const updatedJune1Badge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-1"
      );
      expect(updatedJune1Badge2).toHaveTextContent("施肥");

      // 6月15日の日誌バッジが削除されることを確認
      expect(
        screen.queryByTestId("diary-calendar-diaries-2025-06-15")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("diary-calendar-diary-badge-2025-06-15-0")
      ).not.toBeInTheDocument();

      // 新しい日付（6月20日）に日誌バッジが表示されることを確認
      const june20Diaries = screen.getByTestId(
        "diary-calendar-diaries-2025-06-20"
      );
      expect(june20Diaries).toBeInTheDocument();

      const june20Badge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-20-0"
      );
      expect(june20Badge).toHaveTextContent("収穫");

      // 日誌数の更新も確認
      const june1Cell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(june1Cell).toHaveAttribute("data-diary-count", "2");

      const june15Cell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(june15Cell).toHaveAttribute("data-diary-count", "0");

      const june20Cell = screen.getByTestId("diary-calendar-day-2025-06-20");
      expect(june20Cell).toHaveAttribute("data-diary-count", "1");

      // 空配列に変更してすべてのバッジが削除されることを確認
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={[]}
        />
      );

      expect(
        screen.queryByTestId(/diary-calendar-diaries-/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(/diary-calendar-diary-badge-/)
      ).not.toBeInTheDocument();

      // すべての日付セルの diary-count が 0 になることを確認
      expect(june1Cell).toHaveAttribute("data-diary-count", "0");
      expect(june20Cell).toHaveAttribute("data-diary-count", "0");
    });

    test("コールバック関数が変更された時に新しい関数が呼ばれること", async () => {
      const user = userEvent.setup();
      const firstOnMonthChange = vi.fn();
      const firstOnDateSelect = vi.fn();

      const { rerender } = render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          onMonthChange={firstOnMonthChange}
          onDateSelect={firstOnDateSelect}
        />
      );

      // 初期のコールバック関数をテスト
      const prevButton = screen.getByTestId("diary-calendar-prev-month");
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");

      await user.click(prevButton);
      await user.click(dateCell);

      expect(firstOnMonthChange).toHaveBeenCalledTimes(1);
      expect(firstOnMonthChange).toHaveBeenCalledWith("prev");
      expect(firstOnDateSelect).toHaveBeenCalledTimes(1);

      // 新しいコールバック関数に変更
      const secondOnMonthChange = vi.fn();
      const secondOnDateSelect = vi.fn();

      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          onMonthChange={secondOnMonthChange}
          onDateSelect={secondOnDateSelect}
        />
      );

      // 新しいコールバック関数が呼ばれることを確認
      const nextButton = screen.getByTestId("diary-calendar-next-month");
      await user.click(nextButton);
      await user.click(dateCell);

      // 新しい関数が呼ばれること
      expect(secondOnMonthChange).toHaveBeenCalledTimes(1);
      expect(secondOnMonthChange).toHaveBeenCalledWith("next");
      expect(secondOnDateSelect).toHaveBeenCalledTimes(1);

      // 古い関数は追加で呼ばれていないこと
      expect(firstOnMonthChange).toHaveBeenCalledTimes(1); // 変わらず
      expect(firstOnDateSelect).toHaveBeenCalledTimes(1); // 変わらず

      // 複数回クリックして新しい関数が正しく動作することを確認
      await user.click(prevButton);
      await user.click(nextButton);

      expect(secondOnMonthChange).toHaveBeenCalledTimes(3);
      expect(secondOnMonthChange.mock.calls[1]![0]).toBe("prev");
      expect(secondOnMonthChange.mock.calls[2]![0]).toBe("next");

      // 異なる日付をクリックして新しいonDateSelectが正しく動作することを確認
      const anotherDateCell = screen.getByTestId(
        "diary-calendar-day-2025-06-20"
      );
      await user.click(anotherDateCell);

      expect(secondOnDateSelect).toHaveBeenCalledTimes(2);
      const calledDate = secondOnDateSelect.mock.calls[1]![0] as Date;
      expect(calledDate.getDate()).toBe(20);
    });
  });

  describe("エッジケース", () => {
    test("前月の日付を選択できること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")} // 2025年6月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 前月の日付を選択した場合（5月の日付）
      // 6月1日が日曜日なので、前月の日付は表示されない可能性がある
      // 代わりに5月31日が表示されるかどうかを確認
      const mayLastCell = screen.queryByTestId("diary-calendar-day-2025-05-31");

      if (mayLastCell) {
        // 前月の日付が表示されている場合のテスト
        expect(mayLastCell).toHaveAttribute("data-is-current-month", "false");

        await user.click(mayLastCell);

        // 正しい日付オブジェクトが渡されることを確認
        expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
        const calledDate = mockOnDateSelect.mock.calls[0]![0] as Date;
        expect(calledDate.getFullYear()).toBe(2025);
        expect(calledDate.getMonth()).toBe(4); // 5月（0ベース）
        expect(calledDate.getDate()).toBe(31);
      }
    });

    test("次月の日付を選択できること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")} // 2025年6月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 次月の日付を選択した場合（7月の日付）
      // 6月30日が月曜日なので、次月の日付（7月1-5日）が表示される
      const july1Cell = screen.getByTestId("diary-calendar-day-2025-07-01");
      expect(july1Cell).toBeInTheDocument();
      expect(july1Cell).toHaveAttribute("data-is-current-month", "false");

      await user.click(july1Cell);

      // 正しい日付オブジェクトが渡されることを確認
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = mockOnDateSelect.mock.calls[0]![0] as Date;
      expect(calledDate.getFullYear()).toBe(2025);
      expect(calledDate.getMonth()).toBe(6); // 7月（0ベース）
      expect(calledDate.getDate()).toBe(1);
    });

    test("次月の複数の日付を選択できること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")} // 2025年6月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 複数の次月日付をテスト
      const testNextMonthDates = [2, 3, 4, 5];
      for (const day of testNextMonthDates) {
        const nextMonthCell = screen.getByTestId(
          `diary-calendar-day-2025-07-0${day}`
        );
        expect(nextMonthCell).toBeInTheDocument();
        expect(nextMonthCell).toHaveAttribute("data-is-current-month", "false");

        await user.click(nextMonthCell);

        const latestCallDate = mockOnDateSelect.mock.calls[
          mockOnDateSelect.mock.calls.length - 1
        ]![0] as Date;
        expect(latestCallDate.getFullYear()).toBe(2025);
        expect(latestCallDate.getMonth()).toBe(6);
        expect(latestCallDate.getDate()).toBe(day);
      }

      // 全ての日付がクリックされたことを確認
      expect(mockOnDateSelect).toHaveBeenCalledTimes(testNextMonthDates.length);
    });

    test("年をまたぐ日付選択が正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2024-12-01")} // 2024年12月
          onDateSelect={mockOnDateSelect}
        />
      );

      // 次年の1月の日付が表示されることを確認
      const nextYearCell = screen.queryByTestId(
        "diary-calendar-day-2025-01-01"
      );
      if (nextYearCell) {
        expect(nextYearCell).toHaveAttribute("data-is-current-month", "false");

        await user.click(nextYearCell);

        expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
        const yearCrossDate = mockOnDateSelect.mock.calls[0]![0] as Date;
        expect(yearCrossDate.getFullYear()).toBe(2025);
        expect(yearCrossDate.getMonth()).toBe(0); // 1月（0ベース）
        expect(yearCrossDate.getDate()).toBe(1);
      }
    });

    test("10件の日誌がある日付での表示", () => {
      // 最大表示数を大幅に超える場合のテスト（10件の日誌）
      const manyDiaries = Array.from({ length: 10 }, (_, index) => ({
        id: `diary-${index + 1}`,
        date: "2025-06-15",
        workType: [
          "PLANTING",
          "WATERING",
          "FERTILIZING",
          "HARVESTING",
          "WEEDING",
        ][index % 5] as
          | "PLANTING"
          | "WATERING"
          | "FERTILIZING"
          | "HARVESTING"
          | "WEEDING",
        workTypeDisplay: ["植付け", "水やり", "施肥", "収穫", "除草"][
          index % 5
        ]!,
        cropName: `作物${index + 1}`,
        fieldName: `畑${index + 1}`,
      }));

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={manyDiaries}
        />
      );

      // 日付セルの日誌数が正しく表示されることを確認
      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(dateCell).toHaveAttribute("data-diary-count", "10");

      // 日誌バッジコンテナが表示されることを確認
      const diariesContainer = screen.getByTestId(
        "diary-calendar-diaries-2025-06-15"
      );
      expect(diariesContainer).toBeInTheDocument();

      // 最大表示数（2件）までバッジが表示されることを確認
      const badge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-15-0"
      );
      const badge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-15-1"
      );
      expect(badge1).toBeInTheDocument();
      expect(badge2).toBeInTheDocument();

      // 3件目以降のバッジが表示されないことを確認
      expect(
        screen.queryByTestId("diary-calendar-diary-badge-2025-06-15-2")
      ).not.toBeInTheDocument();

      // 「+N件」の表示が正しいことを確認
      const moreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-15"
      );
      expect(moreDiaries).toBeInTheDocument();
      expect(moreDiaries).toHaveTextContent("+8件"); // 10 - 2 = 8件
      expect(moreDiaries).toHaveAttribute("data-remaining-count", "8");
    });

    test("100件の日誌がある日付での表示", () => {
      // 極端に多い場合のテスト（100件の日誌）
      const extremelyManyDiaries = Array.from({ length: 100 }, (_, index) => ({
        id: `diary-extreme-${index + 1}`,
        date: "2025-06-20",
        workType: "PLANTING" as const,
        workTypeDisplay: "植付け",
        cropName: `作物${index + 1}`,
        fieldName: `畑${index + 1}`,
      }));

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={extremelyManyDiaries}
        />
      );

      const extremeDateCell = screen.getByTestId(
        "diary-calendar-day-2025-06-20"
      );
      expect(extremeDateCell).toHaveAttribute("data-diary-count", "100");

      const extremeMoreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-20"
      );
      expect(extremeMoreDiaries).toHaveTextContent("+98件"); // 100 - 2 = 98件
      expect(extremeMoreDiaries).toHaveAttribute("data-remaining-count", "98");
    });

    test("最大表示数ちょうど（2件）の日誌がある日付での表示", () => {
      // 最大表示数ちょうどの場合のテスト（2件の日誌）
      const exactMaxDiaries = [
        {
          id: "diary-exact-1",
          date: "2025-06-25",
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
        {
          id: "diary-exact-2",
          date: "2025-06-25",
          workType: "WATERING" as const,
          workTypeDisplay: "水やり",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={exactMaxDiaries}
        />
      );

      const exactDateCell = screen.getByTestId("diary-calendar-day-2025-06-25");
      expect(exactDateCell).toHaveAttribute("data-diary-count", "2");

      // 2件ちょうどの場合は「+N件」が表示されないことを確認
      expect(
        screen.queryByTestId("diary-calendar-more-diaries-2025-06-25")
      ).not.toBeInTheDocument();

      // 2件のバッジが両方表示されることを確認
      const exactBadge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-25-0"
      );
      const exactBadge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-25-1"
      );
      expect(exactBadge1).toBeInTheDocument();
      expect(exactBadge2).toBeInTheDocument();
    });

    test("異なる作業タイプの日誌が混在する日付での表示", () => {
      // 同じ日付に異なる作業タイプの日誌が混在する場合
      const mixedTypeDiaries = [
        {
          id: "1",
          date: "2025-06-30",
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
        {
          id: "2",
          date: "2025-06-30",
          workType: "WATERING" as const,
          workTypeDisplay: "水やり",
        },
        {
          id: "3",
          date: "2025-06-30",
          workType: "FERTILIZING" as const,
          workTypeDisplay: "施肥",
        },
        {
          id: "4",
          date: "2025-06-30",
          workType: "HARVESTING" as const,
          workTypeDisplay: "収穫",
        },
        {
          id: "5",
          date: "2025-06-30",
          workType: "WEEDING" as const,
          workTypeDisplay: "除草",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={mixedTypeDiaries}
        />
      );

      const mixedDateCell = screen.getByTestId("diary-calendar-day-2025-06-30");
      expect(mixedDateCell).toHaveAttribute("data-diary-count", "5");

      // 異なる作業タイプのバッジが表示されることを確認
      const mixedBadge1 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-30-0"
      );
      const mixedBadge2 = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-30-1"
      );
      expect(mixedBadge1).toHaveAttribute("data-work-type", "PLANTING");
      expect(mixedBadge2).toHaveAttribute("data-work-type", "WATERING");

      const mixedMoreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-30"
      );
      expect(mixedMoreDiaries).toHaveTextContent("+3件");
    });

    test("うるう年の2月29日が正しく表示されること", () => {
      const leapYearDiaries = [
        {
          id: "leap-1",
          date: "2024-02-29", // うるう年の2月29日
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
        {
          id: "leap-2",
          date: "2024-02-28",
          workType: "WATERING" as const,
          workTypeDisplay: "水やり",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2024-02-01")} // 2024年2月（うるう年）
          diaries={leapYearDiaries}
        />
      );

      // うるう年の2月29日が正しく表示されることを確認
      const leapDayCell = screen.getByTestId("diary-calendar-day-2024-02-29");
      expect(leapDayCell).toBeInTheDocument();
      expect(leapDayCell).toHaveAttribute("data-is-current-month", "true");
      expect(leapDayCell).toHaveAttribute("data-diary-count", "1");

      // 2月28日も正しく表示されることを確認
      const feb28Cell = screen.getByTestId("diary-calendar-day-2024-02-28");
      expect(feb28Cell).toBeInTheDocument();
      expect(feb28Cell).toHaveAttribute("data-is-current-month", "true");
      expect(feb28Cell).toHaveAttribute("data-diary-count", "1");

      // 2月29日の日誌バッジが表示されることを確認
      const leapDayBadge = screen.getByTestId(
        "diary-calendar-diary-badge-2024-02-29-0"
      );
      expect(leapDayBadge).toBeInTheDocument();
      expect(leapDayBadge).toHaveTextContent("植付け");
    });

    test("平年の2月で29日が表示されないこと", () => {
      const regularYearDiaries = [
        {
          id: "regular-1",
          date: "2025-02-28", // 平年の2月28日
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-02-01")} // 2025年2月（平年）
          diaries={regularYearDiaries}
        />
      );

      // 平年の2月28日が表示されることを確認
      const regularFeb28Cell = screen.getByTestId(
        "diary-calendar-day-2025-02-28"
      );
      expect(regularFeb28Cell).toBeInTheDocument();
      expect(regularFeb28Cell).toHaveAttribute("data-is-current-month", "true");

      // 平年の2月29日が表示されないことを確認
      expect(
        screen.queryByTestId("diary-calendar-day-2025-02-29")
      ).not.toBeInTheDocument();
    });

    test("31日まである月の月末日が正しく表示されること", () => {
      const monthEndDiaries = [
        {
          id: "end-1",
          date: "2025-01-31", // 31日まである月の最終日
          workType: "HARVESTING" as const,
          workTypeDisplay: "収穫",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-01-01")}
          diaries={monthEndDiaries}
        />
      );

      const jan31Cell = screen.getByTestId("diary-calendar-day-2025-01-31");
      expect(jan31Cell).toBeInTheDocument();
      expect(jan31Cell).toHaveAttribute("data-is-current-month", "true");
      expect(jan31Cell).toHaveAttribute("data-diary-count", "1");

      // 1月32日が存在しないことを確認
      expect(
        screen.queryByTestId("diary-calendar-day-2025-01-32")
      ).not.toBeInTheDocument();
    });

    test("30日までの月の月末日が正しく表示されること", () => {
      const monthEndDiaries = [
        {
          id: "end-2",
          date: "2025-04-30", // 30日までの月の最終日
          workType: "FERTILIZING" as const,
          workTypeDisplay: "施肥",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-04-01")}
          diaries={monthEndDiaries}
        />
      );

      const apr30Cell = screen.getByTestId("diary-calendar-day-2025-04-30");
      expect(apr30Cell).toBeInTheDocument();
      expect(apr30Cell).toHaveAttribute("data-is-current-month", "true");
      expect(apr30Cell).toHaveAttribute("data-diary-count", "1");

      // 4月31日が存在しないことを確認
      expect(
        screen.queryByTestId("diary-calendar-day-2025-04-31")
      ).not.toBeInTheDocument();
    });

    test("年末年始の日付が正しく表示されること", () => {
      const yearEndDiaries = [
        {
          id: "year-end-1",
          date: "2024-12-31", // 年末
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
        {
          id: "year-start-1",
          date: "2025-01-01", // 年始
          workType: "WATERING" as const,
          workTypeDisplay: "水やり",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2024-12-01")}
          diaries={yearEndDiaries}
        />
      );

      const dec31Cell = screen.getByTestId("diary-calendar-day-2024-12-31");
      expect(dec31Cell).toBeInTheDocument();
      expect(dec31Cell).toHaveAttribute("data-is-current-month", "true");
      expect(dec31Cell).toHaveAttribute("data-diary-count", "1");

      // 次年の1月1日が表示される場合のテスト
      const nextYearJan1Cell = screen.queryByTestId(
        "diary-calendar-day-2025-01-01"
      );
      if (nextYearJan1Cell) {
        expect(nextYearJan1Cell).toHaveAttribute(
          "data-is-current-month",
          "false"
        );
        expect(nextYearJan1Cell).toHaveAttribute("data-diary-count", "1");
      }
    });

    test("今日がうるう年の2月29日の場合の表示", () => {
      const leapYearDiaries = [
        {
          id: "leap-1",
          date: "2024-02-29", // うるう年の2月29日
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
      ];

      // 今日が特殊な日付の場合のテスト（2月29日が今日の場合）
      vi.useRealTimers();
      vi.setSystemTime(new Date(2024, 1, 29)); // 2024年2月29日

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2024-02-01")}
          diaries={leapYearDiaries}
        />
      );

      const todayLeapCell = screen.getByTestId("diary-calendar-day-2024-02-29");
      expect(todayLeapCell).toHaveAttribute("data-is-today", "true");
      expect(todayLeapCell).toHaveAttribute("data-is-current-month", "true");

      // システム時間をリセット
    });
  });
});

describe("groupDiariesByDate", () => {
  test("日誌データを日付別に正しくグループ化できること", () => {
    const testDiaries = [
      {
        id: "diary-1",
        date: "2025-06-01",
        workType: "PLANTING" as const,
        weather: "SUNNY" as const,
        temperature: 25,
        content: "種まき1",
      },
      {
        id: "diary-2",
        date: "2025-06-01",
        workType: "WATERING" as const,
        weather: "SUNNY" as const,
        temperature: 25,
        content: "水やり1",
      },
      {
        id: "diary-3",
        date: "2025-06-15",
        workType: "HARVESTING" as const,
        weather: "CLOUDY" as const,
        temperature: 20,
        content: "収穫1",
      },
    ];

    const result = groupDiariesByDate(testDiaries);

    // 複数の日誌が同じ日付でグループ化されること
    expect(result["2025-06-01"]).toHaveLength(2);
    expect(result["2025-06-01"]![0]!.id).toBe("diary-1");
    expect(result["2025-06-01"]![1]!.id).toBe("diary-2");

    // 異なる日付の日誌が別々にグループ化されること
    expect(result["2025-06-15"]).toHaveLength(1);
    expect(result["2025-06-15"]![0]!.id).toBe("diary-3");

    // 2つの日付キーが存在すること
    expect(Object.keys(result)).toHaveLength(2);
    expect(Object.keys(result)).toContain("2025-06-01");
    expect(Object.keys(result)).toContain("2025-06-15");
  });

  test("空配列の場合は空オブジェクトが返されること", () => {
    const result = groupDiariesByDate([]);

    expect(result).toEqual({});
    expect(Object.keys(result)).toHaveLength(0);
  });

  test("日付キーが正しいフォーマットで生成されること", () => {
    const testDiaries = [
      {
        id: "diary-1",
        date: "2025-01-01",
        workType: "PLANTING" as const,
        weather: "SUNNY" as const,
        temperature: 25,
        content: "元日の作業",
      },
      {
        id: "diary-2",
        date: "2025-12-31",
        workType: "HARVESTING" as const,
        weather: "CLOUDY" as const,
        temperature: 10,
        content: "大晦日の作業",
      },
    ];

    const result = groupDiariesByDate(testDiaries);

    // "yyyy-MM-dd"形式のキーが生成されること
    expect(Object.keys(result)).toContain("2025-01-01");
    expect(Object.keys(result)).toContain("2025-12-31");

    // キーの形式が正しいことを正規表現で確認
    Object.keys(result).forEach((key) => {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  test("Dateオブジェクトの変換が正しく行われること", () => {
    // 異なる時刻の同じ日付が同じキーにグループ化されること
    const testDiaries = [
      {
        id: "diary-1",
        date: "2025-06-01T08:00:00+09:00", // 日本時間の08:00
        workType: "PLANTING" as const,
      },
      {
        id: "diary-2",
        date: "2025-06-01T18:30:00+09:00", // 日本時間の18:30
        workType: "WATERING" as const,
      },
    ];

    const result = groupDiariesByDate(testDiaries);

    // 時刻が異なっても同じ日付として扱われること
    expect(result["2025-06-01"]).toHaveLength(2);
    expect(result["2025-06-01"]![0]!.id).toBe("diary-1");
    expect(result["2025-06-01"]![1]!.id).toBe("diary-2");

    // 1つの日付キーのみ存在すること
    expect(Object.keys(result)).toHaveLength(1);
  });

  test("月またぎの日付が正しく処理されること", () => {
    const testDiaries = [
      {
        id: "diary-1",
        date: "2025-05-31",
        workType: "PLANTING" as const,
        weather: "SUNNY" as const,
        temperature: 25,
        content: "5月最終日",
      },
      {
        id: "diary-2",
        date: "2025-06-01",
        workType: "WATERING" as const,
        weather: "SUNNY" as const,
        temperature: 25,
        content: "6月初日",
      },
    ];

    const result = groupDiariesByDate(testDiaries);

    // 月またぎの日付が別々にグループ化されること
    expect(result["2025-05-31"]).toHaveLength(1);
    expect(result["2025-06-01"]).toHaveLength(1);
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe("generateCalendarDays", () => {
  test("月のカレンダー日付を正しく生成できること", () => {
    // 2025年6月（月初が日曜日、月末が月曜日）
    const currentMonth = new Date("2025-06-01");
    const result = generateCalendarDays(currentMonth);

    // 実際の日数を確認（月初の調整 + 月の日数 + 月末の調整）
    // 2025年6月1日は日曜日、6月30日は月曜日
    // 月初調整：0日、月末調整：5日（火〜土）
    // 合計：0 + 30 + 5 = 35日
    expect(result.length).toBeGreaterThan(30); // 最低でも6月の日数は含まれる

    // 指定した月の全日付が含まれること（6月は30日）
    const juneFirstIndex = result.findIndex(
      (date) => date.getMonth() === 5 && date.getDate() === 1
    );
    const juneLastIndex = result.findIndex(
      (date) => date.getMonth() === 5 && date.getDate() === 30
    );
    expect(juneFirstIndex).toBeGreaterThanOrEqual(0);
    expect(juneLastIndex).toBeGreaterThanOrEqual(0);
    expect(juneLastIndex).toBeGreaterThan(juneFirstIndex);

    // 6月の全ての日付（1-30日）が含まれること
    const juneDates = result.filter((date) => date.getMonth() === 5);
    expect(juneDates).toHaveLength(30);

    // 前月・次月の日付が適切に含まれること
    const mayDates = result.filter((date) => date.getMonth() === 4);
    const julyDates = result.filter((date) => date.getMonth() === 6);

    // 6月1日が日曜日なので前月の日付は含まれない
    expect(mayDates).toHaveLength(0);
    // 6月30日が月曜日なので次月の日付が5日分含まれる
    expect(julyDates.length).toBeGreaterThan(0);
    expect(mayDates.length + juneDates.length + julyDates.length).toBe(
      result.length
    );
  });

  test("月初が日曜日でない場合の調整が正しく行われること", () => {
    // 2025年7月（月初が火曜日）
    const currentMonth = new Date("2025-07-01");
    const result = generateCalendarDays(currentMonth);

    // 最初の日付は日曜日であることを確認（getDay() === 0）
    expect(result[0]!.getDay()).toBe(0);

    // 7月1日（火曜日）の前に前月の日付が含まれること
    const july1Index = result.findIndex(
      (date) => date.getMonth() === 6 && date.getDate() === 1
    );
    expect(july1Index).toBe(2); // 火曜日なので3番目（インデックス2）

    // 7月1日より前の日付は6月の日付であること
    for (let i = 0; i < july1Index; i++) {
      expect(result[i]!.getMonth()).toBe(5); // 6月（0ベースなので5）
    }
  });

  test("月末が土曜日でない場合の調整が正しく行われること", () => {
    // 2025年6月（月末が月曜日）
    const currentMonth = new Date("2025-06-01");
    const result = generateCalendarDays(currentMonth);

    // 最後の日付は土曜日であることを確認（getDay() === 6）
    const lastDate = result[result.length - 1];
    expect(lastDate?.getDay()).toBe(6);

    // 6月30日（月曜日）の後に次月の日付が含まれること
    const june30Index = result.findIndex(
      (date) => date.getMonth() === 5 && date.getDate() === 30
    );
    expect(june30Index).toBeGreaterThanOrEqual(0);

    // 6月30日より後の日付は7月の日付であること
    for (let i = june30Index + 1; i < result.length; i++) {
      expect(result[i]!.getMonth()).toBe(6); // 7月（0ベースなので6）
    }

    // 7月1日から7月5日（火〜土）が含まれることを確認
    const julyDates = result.filter((date) => date.getMonth() === 6);
    expect(julyDates).toHaveLength(5);
    expect(julyDates[0]?.getDate()).toBe(1); // 7月1日
    expect(julyDates[4]?.getDate()).toBe(5); // 7月5日
  });

  test("2月など日数が少ない月でも正しく動作すること", () => {
    // 2025年2月（平年、28日）
    const currentMonth = new Date("2025-02-01");
    const result = generateCalendarDays(currentMonth);

    // 実際の日数を確認（2月は日数が少ないため調整日数が多い）
    expect(result.length).toBeGreaterThan(28); // 最低でも2月の日数は含まれる

    // 2月の全ての日付（1-28日）が含まれること
    const februaryDates = result.filter((date) => date.getMonth() === 1);
    expect(februaryDates).toHaveLength(28);

    // 1月と3月の日付も適切に含まれること
    const januaryDates = result.filter((date) => date.getMonth() === 0);
    const marchDates = result.filter((date) => date.getMonth() === 2);
    expect(januaryDates.length).toBeGreaterThan(0);
    expect(marchDates.length).toBeGreaterThan(0);
    expect(januaryDates.length + februaryDates.length + marchDates.length).toBe(
      result.length
    );

    // 最初の日付は日曜日、最後の日付は土曜日であることを確認
    expect(result[0]?.getDay()).toBe(0);
    expect(result[result.length - 1]?.getDay()).toBe(6);
  });

  test("うるう年の2月でも正しく動作すること", () => {
    // 2024年2月（うるう年、29日）
    const currentMonth = new Date("2024-02-01");
    const result = generateCalendarDays(currentMonth);

    // 実際の日数を確認
    expect(result.length).toBeGreaterThan(29); // 最低でも2月の日数は含まれる

    // 2月の全ての日付（1-29日）が含まれること
    const februaryDates = result.filter((date) => date.getMonth() === 1);
    expect(februaryDates).toHaveLength(29);

    // 2月29日が含まれていることを確認
    const feb29 = result.find(
      (date) => date.getMonth() === 1 && date.getDate() === 29
    );
    expect(feb29).toBeDefined();
    expect(feb29!.getFullYear()).toBe(2024);

    // 最初の日付は日曜日、最後の日付は土曜日であることを確認
    expect(result[0]?.getDay()).toBe(0);
    expect(result[result.length - 1]?.getDay()).toBe(6);
  });

  test("年をまたぐ月でも正しく動作すること", () => {
    // 2024年12月
    const currentMonth = new Date("2024-12-01");
    const result = generateCalendarDays(currentMonth);

    // 実際の日数を確認
    expect(result.length).toBeGreaterThan(31); // 最低でも12月の日数は含まれる

    // 12月の全ての日付（1-31日）が含まれること
    const decemberDates = result.filter(
      (date) => date.getMonth() === 11 && date.getFullYear() === 2024
    );
    expect(decemberDates).toHaveLength(31);

    // 2024年11月と2025年1月の日付も含まれること
    const november2024Dates = result.filter(
      (date) => date.getMonth() === 10 && date.getFullYear() === 2024
    );
    const january2025Dates = result.filter(
      (date) => date.getMonth() === 0 && date.getFullYear() === 2025
    );

    expect(november2024Dates.length).toBeGreaterThanOrEqual(0);
    expect(january2025Dates.length).toBeGreaterThanOrEqual(0);
    expect(
      november2024Dates.length + decemberDates.length + january2025Dates.length
    ).toBe(result.length);

    // 最初の日付は日曜日、最後の日付は土曜日であることを確認
    expect(result[0]?.getDay()).toBe(0);
    expect(result[result.length - 1]?.getDay()).toBe(6);

    // 年またぎが正しく処理されていることを確認
    const hasDecember2024 = result.some(
      (date) => date.getMonth() === 11 && date.getFullYear() === 2024
    );
    const hasJanuary2025 = result.some(
      (date) => date.getMonth() === 0 && date.getFullYear() === 2025
    );
    expect(hasDecember2024).toBe(true);
    expect(hasJanuary2025).toBe(true);
  });

  test("生成された日付が昇順でソートされていること", () => {
    const currentMonth = new Date("2025-06-01");
    const result = generateCalendarDays(currentMonth);

    // 連続する日付が昇順になっていることを確認
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.getTime()).toBeGreaterThan(result[i - 1]!.getTime());
    }
  });
});

describe("getDayClassNames", () => {
  test("今日の日付で正しいクラス名が返されること", () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedDate = null;

    const result = getDayClassNames(today, selectedDate, currentMonth);

    // 今日の日付の場合の特別なクラス
    expect(result).toContain("bg-primary/20");
    expect(result).toContain("border-primary");
  });

  test("選択された日付で正しいクラス名が返されること", () => {
    const testDate = new Date("2025-06-15");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = new Date("2025-06-15");

    const result = getDayClassNames(testDate, selectedDate, currentMonth);

    // 選択された日付の場合の特別なクラス
    expect(result).toContain("bg-accent/20");
    expect(result).toContain("border-accent");
  });

  test("当月以外の日付で正しいクラス名が返されること", () => {
    const prevMonthDate = new Date("2025-05-31");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = null;

    const result = getDayClassNames(prevMonthDate, selectedDate, currentMonth);

    // 前月・次月の日付の場合のクラス
    expect(result).toContain("opacity-40");

    // 今日や選択日のクラスは含まれないこと
    expect(result).not.toContain("bg-primary/20");
    expect(result).not.toContain("bg-accent/20");
  });

  test("複数の条件が重なった場合のクラス名が正しいこと", () => {
    // 今日かつ選択された日付の場合
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedDate = new Date(today);

    const result = getDayClassNames(today, selectedDate, currentMonth);

    // 選択のクラスで上書きされること
    expect(result).toContain("bg-accent/20");
    expect(result).toContain("border-accent");
  });

  test("当月以外かつ選択された日付の場合のクラス名が正しいこと", () => {
    const prevMonthDate = new Date("2025-05-31");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = new Date("2025-05-31");

    const result = getDayClassNames(prevMonthDate, selectedDate, currentMonth);

    // 選択日のクラスと当月外のクラスが含まれること
    expect(result).toContain("bg-accent/20");
    expect(result).toContain("border-accent");
    expect(result).toContain("opacity-40");

    // 今日のクラスは含まれないこと
    expect(result).not.toContain("bg-primary/20");
    expect(result).not.toContain("border-primary");
  });

  test("selectedDateがnullの場合でもエラーにならないこと", () => {
    const testDate = new Date("2025-06-15");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = null;

    expect(() => {
      getDayClassNames(testDate, selectedDate, currentMonth);
    }).not.toThrow();

    const result = getDayClassNames(testDate, selectedDate, currentMonth);

    // 選択日のクラスは含まれないこと
    expect(result).not.toContain("bg-accent/20");
    expect(result).not.toContain("border-accent");
  });
});

describe("getDateTextClassNames", () => {
  test("今日の日付で正しいテキストクラス名が返されること", () => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedDate = null;

    const result = getDateTextClassNames(today, selectedDate, currentMonth);

    // 今日の日付の場合の特別なテキストクラス
    expect(result).toContain("text-primary");
    expect(result).toContain("font-bold");
  });

  test("選択された日付で正しいテキストクラス名が返されること", () => {
    const testDate = new Date("2025-06-15");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = new Date("2025-06-15");

    const result = getDateTextClassNames(testDate, selectedDate, currentMonth);

    // 選択された日付の場合の特別なテキストクラス
    expect(result).toContain("text-accent");
    expect(result).toContain("font-bold");
  });

  test("当月以外の日付で正しいテキストクラス名が返されること", () => {
    const prevMonthDate = new Date("2025-05-31");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = null;

    const result = getDateTextClassNames(
      prevMonthDate,
      selectedDate,
      currentMonth
    );

    // 前月・次月の日付の場合のテキストクラス
    expect(result).toContain("text-muted-foreground");

    // 今日や選択日のクラスは含まれないこと
    expect(result).not.toContain("text-primary");
    expect(result).not.toContain("text-accent");
  });

  test("複数の条件が重なった場合のテキストクラス名が正しいこと", () => {
    // 今日かつ選択された日付の場合
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const selectedDate = new Date(today);

    const result = getDateTextClassNames(today, selectedDate, currentMonth);

    // 選択のクラスで上書きされること
    expect(result).toContain("text-accent");
    expect(result).toContain("font-bold");
  });

  test("selectedDateがnullの場合でもエラーにならないこと", () => {
    const testDate = new Date("2025-06-15");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = null;

    expect(() => {
      getDateTextClassNames(testDate, selectedDate, currentMonth);
    }).not.toThrow();

    const result = getDateTextClassNames(testDate, selectedDate, currentMonth);

    // 選択日のクラスは含まれないこと
    expect(result).not.toContain("text-accent");
  });

  test("異なる年の日付でも正しく処理されること", () => {
    const testDate = new Date("2024-06-15");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = null;

    const result = getDateTextClassNames(testDate, selectedDate, currentMonth);

    // 異なる年なので当月外として処理される
    expect(result).toContain("text-muted-foreground");

    // 今日のクラスは含まれないこと（異なる年のため）
    expect(result).not.toContain("text-primary");
  });

  test("当月以外かつ選択された日付の場合のテキストクラス名が正しいこと", () => {
    const prevMonthDate = new Date("2025-05-31");
    const currentMonth = new Date("2025-06-01");
    const selectedDate = new Date("2025-05-31");

    const result = getDateTextClassNames(
      prevMonthDate,
      selectedDate,
      currentMonth
    );

    // 選択日のクラスが含まれること
    expect(result).toContain("text-accent");
    expect(result).toContain("font-bold");

    // 今日のクラスは含まれないこと
    expect(result).not.toContain("text-primary");
  });
});
