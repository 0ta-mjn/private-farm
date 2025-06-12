// 統廃合後のdiary-calendar-viewテストファイル
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
import { WorkTypeKey } from "@repo/config";

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

  describe("基本レンダリング", () => {
    test("カレンダーの主要要素と日誌データが正しく表示されること", () => {
      const testDate = new Date("2025-06-15");
      render(<DiaryCalendarView {...defaultProps} currentMonth={testDate} />);

      // 主要コンポーネントの表示確認
      expect(screen.getByTestId("diary-calendar")).toBeInTheDocument();
      expect(screen.getByTestId("diary-calendar-title")).toHaveTextContent(
        "2025年 6月"
      );
      expect(
        screen.getByTestId("diary-calendar-prev-month")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("diary-calendar-next-month")
      ).toBeInTheDocument();
      expect(screen.getByTestId("diary-calendar-weekdays")).toBeInTheDocument();
      expect(screen.getByTestId("diary-calendar-grid")).toBeInTheDocument();

      // 曜日ヘッダーの表示確認
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      weekdays.forEach((day, index) => {
        const weekdayElement = screen.getByTestId(
          `diary-calendar-weekday-${index}`
        );
        expect(weekdayElement).toHaveTextContent(day);
      });

      // 日曜日・土曜日の色確認
      expect(screen.getByTestId("diary-calendar-weekday-0")).toHaveClass(
        "text-red-500"
      );
      expect(screen.getByTestId("diary-calendar-weekday-6")).toHaveClass(
        "text-blue-500"
      );

      // 日付セルの基本属性確認
      const june1 = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(june1).toHaveAttribute("data-date", "2025-06-01");
      expect(june1).toHaveAttribute("data-is-current-month", "true");

      // 日誌バッジの表示確認
      const plantingBadge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-06-01-0"
      );
      expect(plantingBadge).toHaveAttribute("data-work-type", "PLANTING");

      // 日誌数が多い日の「+N件」表示確認
      const moreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-02"
      );
      expect(moreDiaries).toHaveTextContent("+1件");
      expect(moreDiaries).toHaveAttribute("data-remaining-count", "1");
    });

    test("空データでもエラーにならないこと", () => {
      render(<DiaryCalendarView {...defaultProps} diaries={[]} />);

      expect(screen.getByTestId("diary-calendar")).toBeInTheDocument();
      expect(
        screen.queryByTestId(/diary-calendar-diaries-/)
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("diary-calendar-day-2025-06-01")
      ).toHaveAttribute("data-diary-count", "0");
    });
  });

  describe("視覚的状態とユーザー操作", () => {
    test("今日・選択日の強調表示とクリック操作が正しく動作すること", async () => {
      // 今日の日付を設定
      vi.setSystemTime(new Date(2025, 5, 1)); // 6月1日
      const user = userEvent.setup();
      const mockOnDateSelect = vi.fn();
      const selectedDate = new Date(2025, 5, 15); // 6月15日

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date(2025, 5, 1)}
          selectedDate={selectedDate}
          onDateSelect={mockOnDateSelect}
        />
      );

      // 今日（6月1日）の強調表示確認
      const todayCell = screen.getByTestId("diary-calendar-day-2025-06-01");
      expect(todayCell).toHaveAttribute("data-is-today", "true");

      // 選択日（6月15日）の強調表示確認
      const selectedCell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(selectedCell).toHaveAttribute("data-is-selected", "true");

      // 他の日付は選択されていないことを確認
      const otherCell = screen.getByTestId("diary-calendar-day-2025-06-02");
      expect(otherCell).toHaveAttribute("data-is-selected", "false");

      // 日付セルのクリック操作
      await user.click(selectedCell);
      expect(mockOnDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = mockOnDateSelect.mock.calls[0]![0] as Date;
      expect(calledDate.getDate()).toBe(15);

      // 当月外日付の薄い表示確認
      const nextMonthCell = screen.getByTestId("diary-calendar-day-2025-07-01");
      expect(nextMonthCell).toHaveAttribute("data-is-current-month", "false");

      // 当月外日付のクリック
      await user.click(nextMonthCell);
      expect(mockOnDateSelect).toHaveBeenCalledTimes(2);
      const nextMonthDate = mockOnDateSelect.mock.calls[1]![0] as Date;
      expect(nextMonthDate.getMonth()).toBe(6); // 7月
    });

    test("月ナビゲーションボタンが正しく動作すること", async () => {
      const user = userEvent.setup();
      const mockOnMonthChange = vi.fn();

      render(
        <DiaryCalendarView
          {...defaultProps}
          onMonthChange={mockOnMonthChange}
        />
      );

      // 前月・次月ボタンのクリック
      const prevButton = screen.getByTestId("diary-calendar-prev-month");
      const nextButton = screen.getByTestId("diary-calendar-next-month");

      await user.click(prevButton);
      expect(mockOnMonthChange).toHaveBeenCalledWith("prev");

      await user.click(nextButton);
      expect(mockOnMonthChange).toHaveBeenCalledWith("next");

      expect(mockOnMonthChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("動的データ更新", () => {
    test("プロップス変更時にカレンダーが正しく更新されること", () => {
      const { rerender } = render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          selectedDate={null}
        />
      );

      // 初期状態確認
      expect(screen.getByTestId("diary-calendar-title")).toHaveTextContent(
        "2025年 6月"
      );
      const june15Cell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(june15Cell).toHaveAttribute("data-is-selected", "false");

      // 月と選択日を変更
      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-07-01")}
          selectedDate={new Date("2025-07-10")}
        />
      );

      // 更新確認
      expect(screen.getByTestId("diary-calendar-title")).toHaveTextContent(
        "2025年 7月"
      );
      const july10Cell = screen.getByTestId("diary-calendar-day-2025-07-10");
      expect(july10Cell).toHaveAttribute("data-is-selected", "true");

      // 日誌データ更新テスト
      const newDiaries = [
        {
          id: "new-diary",
          date: "2025-07-05",
          workType: "SEEDING" as const,
          workTypeDisplay: "播種",
        },
      ];

      rerender(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-07-01")}
          selectedDate={new Date("2025-07-10")}
          diaries={newDiaries}
        />
      );

      // 新しい日誌バッジが表示されることを確認
      const newBadge = screen.getByTestId(
        "diary-calendar-diary-badge-2025-07-05-0"
      );
      expect(newBadge).toHaveTextContent("播種");
    });
  });

  describe("エッジケースと境界値", () => {
    test("大量日誌データと特殊月の処理が正しく動作すること", () => {
      // 大量日誌データのテスト（10件）
      const manyDiaries = Array.from({ length: 10 }, (_, index) => ({
        id: `diary-${index + 1}`,
        date: "2025-06-15",
        workType: [
          "PLANTING",
          "WATERING",
          "FERTILIZING",
          "HARVESTING",
          "WEEDING",
        ][index % 5] as WorkTypeKey,
        workTypeDisplay: ["植付け", "水やり", "施肥", "収穫", "除草"][
          index % 5
        ]!,
      }));

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2025-06-01")}
          diaries={manyDiaries}
        />
      );

      const dateCell = screen.getByTestId("diary-calendar-day-2025-06-15");
      expect(dateCell).toHaveAttribute("data-diary-count", "10");

      // 最大表示数（2件）確認
      expect(
        screen.getByTestId("diary-calendar-diary-badge-2025-06-15-0")
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("diary-calendar-diary-badge-2025-06-15-1")
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("diary-calendar-diary-badge-2025-06-15-2")
      ).not.toBeInTheDocument();

      // 「+N件」表示確認
      const moreDiaries = screen.getByTestId(
        "diary-calendar-more-diaries-2025-06-15"
      );
      expect(moreDiaries).toHaveTextContent("+8件");
    });

    test("うるう年と年末年始の処理が正しく動作すること", () => {
      // うるう年2月のテスト
      const leapYearDiaries = [
        {
          id: "leap-1",
          date: "2024-02-29",
          workType: "PLANTING" as const,
          workTypeDisplay: "植付け",
        },
      ];

      render(
        <DiaryCalendarView
          {...defaultProps}
          currentMonth={new Date("2024-02-01")}
          diaries={leapYearDiaries}
        />
      );

      const leapDayCell = screen.getByTestId("diary-calendar-day-2024-02-29");
      expect(leapDayCell).toBeInTheDocument();
      expect(leapDayCell).toHaveAttribute("data-is-current-month", "true");

      // 年末年始のテスト
      const yearEndDiaries = [
        {
          id: "year-end",
          date: "2024-12-31",
          workType: "HARVESTING" as const,
          workTypeDisplay: "収穫",
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
      expect(dec31Cell).toHaveAttribute("data-is-current-month", "true");
      expect(dec31Cell).toHaveAttribute("data-diary-count", "1");
    });
  });
});

describe("ユーティリティ関数", () => {
  describe("groupDiariesByDate", () => {
    test("日誌データの日付別グループ化が正しく動作すること", () => {
      const testDiaries = [
        {
          id: "diary-1",
          date: "2025-06-01",
          workType: "PLANTING" as const,
        },
        {
          id: "diary-2",
          date: "2025-06-01",
          workType: "WATERING" as const,
        },
        {
          id: "diary-3",
          date: "2025-06-15",
          workType: "HARVESTING" as const,
        },
      ];

      const result = groupDiariesByDate(testDiaries);

      expect(result["2025-06-01"]).toHaveLength(2);
      expect(result["2025-06-15"]).toHaveLength(1);
      expect(Object.keys(result)).toHaveLength(2);

      // 空配列の場合
      expect(groupDiariesByDate([])).toEqual({});

      // 日付フォーマットの確認
      Object.keys(result).forEach((key) => {
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe("generateCalendarDays", () => {
    test("カレンダー日付生成が正しく動作すること", () => {
      // 通常月のテスト
      const june2025 = new Date("2025-06-01");
      const result = generateCalendarDays(june2025);

      expect(result.length).toBeGreaterThan(30);
      expect(result[0]!.getDay()).toBe(0); // 最初は日曜日
      expect(result[result.length - 1]!.getDay()).toBe(6); // 最後は土曜日

      // 6月の全日付が含まれること
      const juneDates = result.filter((date) => date.getMonth() === 5);
      expect(juneDates).toHaveLength(30);

      // 日付が昇順でソートされていること
      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.getTime()).toBeGreaterThan(result[i - 1]!.getTime());
      }

      // うるう年2月のテスト
      const feb2024 = new Date("2024-02-01");
      const leapResult = generateCalendarDays(feb2024);
      const februaryDates = leapResult.filter((date) => date.getMonth() === 1);
      expect(februaryDates).toHaveLength(29); // うるう年なので29日
    });
  });

  describe("スタイル関数", () => {
    test("getDayClassNames・getDateTextClassNamesが正しく動作すること", () => {
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const testDate = new Date("2025-06-15");
      const selectedDate = new Date("2025-06-15");

      // 今日のクラス
      const todayClasses = getDayClassNames(today, null, currentMonth);
      expect(todayClasses).toContain("bg-primary/20");
      expect(todayClasses).toContain("border-primary");

      const todayTextClasses = getDateTextClassNames(today, null, currentMonth);
      expect(todayTextClasses).toContain("text-primary");
      expect(todayTextClasses).toContain("font-bold");

      // 選択日のクラス
      const selectedClasses = getDayClassNames(
        testDate,
        selectedDate,
        new Date("2025-06-01")
      );
      expect(selectedClasses).toContain("bg-accent/20");
      expect(selectedClasses).toContain("border-accent");

      const selectedTextClasses = getDateTextClassNames(
        testDate,
        selectedDate,
        new Date("2025-06-01")
      );
      expect(selectedTextClasses).toContain("text-accent");
      expect(selectedTextClasses).toContain("font-bold");

      // 当月外のクラス
      const prevMonthDate = new Date("2025-05-31");
      const prevMonthClasses = getDayClassNames(
        prevMonthDate,
        null,
        new Date("2025-06-01")
      );
      expect(prevMonthClasses).toContain("opacity-40");

      const prevMonthTextClasses = getDateTextClassNames(
        prevMonthDate,
        null,
        new Date("2025-06-01")
      );
      expect(prevMonthTextClasses).toContain("text-muted-foreground");

      // null値でもエラーにならないこと
      expect(() =>
        getDayClassNames(testDate, null, currentMonth)
      ).not.toThrow();
      expect(() =>
        getDateTextClassNames(testDate, null, currentMonth)
      ).not.toThrow();
    });
  });
});
