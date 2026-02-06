import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format, getDaysInMonth, isSaturday, isSunday } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { TITLE_WEIGHTS } from "../constants";
import type { Staff, Schedules, Holiday, Group } from "../types";

// --- 輔助函式 ---

// 顏色對照表 (ARGB Hex)
const COLORS = {
  HEADER_BG: "FF2D3748", // Slate-800
  HEADER_TEXT: "FFFFFFFF", // White
  HOLIDAY_COL_BG: "FFFEE2E2", // Red-50 (週末/假日欄位底色)
  SHIFT_REGULAR: "FFE5E7EB", // Gray-200 (例)
  SHIFT_LEAVE: "FFFFFFFF", // White (休 - 通常不填色或白色)
  SHIFT_NATIONAL: "FFFFEDD5", // Orange-100 (國)
  SHIFT_MORNING: "FFDBEAFE", // Blue-100
  SHIFT_NIGHT: "FFE0E7FF", // Indigo-100
  SHIFT_FULL: "FFF3E8FF", // Purple-100
  BORDER: "FFCBD5E0", // Slate-300
};

/**
 * 依照權重排序員工
 */
const sortStaffList = (staffList: Staff[]) => {
  return [...staffList].sort((a, b) => {
    const weightA = TITLE_WEIGHTS[a.title as keyof typeof TITLE_WEIGHTS] || 99;
    const weightB = TITLE_WEIGHTS[b.title as keyof typeof TITLE_WEIGHTS] || 99;
    if (weightA !== weightB) return weightA - weightB;
    return a.id.localeCompare(b.id);
  });
};

/**
 * 生成全年度排班 Excel
 */
export const exportAnnualScheduleToExcel = async (
  year: number,
  staffList: Staff[],
  schedules: Schedules,
  holidays: Holiday[],
  groups: Group[],
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "React Smart Scheduler";
  workbook.created = new Date();

  // 迴圈生成 1-12 月的工作表
  for (let month = 0; month < 12; month++) {
    const currentMonthDate = new Date(year, month, 1);
    const sheetName = `${month + 1}月`;
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: "frozen", xSplit: 3, ySplit: 3 }], // 凍結首三行與前三欄
    });

    await generateMonthlySheet(
      worksheet,
      currentMonthDate,
      staffList,
      schedules,
      holidays,
      groups,
    );
  }

  // 匯出檔案
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${year}年度排班表.xlsx`);
};

/**
 * 生成指定月份排班 Excel
 */
export const exportMonthlyScheduleToExcel = async (
  monthDate: Date,
  staffList: Staff[],
  schedules: Schedules,
  holidays: Holiday[],
  groups: Group[],
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "React Smart Scheduler";
  workbook.created = new Date();

  const sheetName = format(monthDate, "yyyy年M月");
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", xSplit: 3, ySplit: 3 }], // 凍結首三行與前三欄
  });

  await generateMonthlySheet(
    worksheet,
    monthDate,
    staffList,
    schedules,
    holidays,
    groups,
  );

  // 匯出檔案
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${format(monthDate, "yyyy-MM")}排班表.xlsx`);
};

/**
 * 生成單一月份工作表邏輯
 */
const generateMonthlySheet = async (
  worksheet: ExcelJS.Worksheet,
  monthDate: Date,
  staffList: Staff[],
  schedules: Schedules,
  holidays: Holiday[],
  groups: Group[],
) => {
  const yearStr = format(monthDate, "yyyy");
  const monthStr = format(monthDate, "MM");
  const yearMonthKey = `${yearStr}-${monthStr}`;

  const daysInMonth = getDaysInMonth(monthDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 1. 建構標題列 (Header Rows)
  const holidayHeaderRowData = ["", "", ""]; // 假日名稱列
  const headerRow1Data = ["工號", "姓名", "職稱"]; // 日期列
  const headerRow2Data = ["", "", ""]; // 星期列
  const dateColumns: {
    dateStr: string;
    isHoliday: boolean;
    colIndex: number;
  }[] = [];

  // 1-1. 動態生成日期與星期欄位
  daysArray.forEach((day, index) => {
    const currentDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      day,
    );
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const weekDay = format(currentDate, "EE", { locale: zhTW }); // e.g., 週一

    // 檢查是否為國定假日或週末
    const holidayInfo = holidays.find((h) => h.date === dateStr);
    const isHoliday =
      isSaturday(currentDate) ||
      isSunday(currentDate) ||
      holidayInfo?.isOff === "2";

    holidayHeaderRowData.push(holidayInfo?.name || "");
    headerRow1Data.push(day.toString());
    headerRow2Data.push(weekDay);

    // 紀錄假日欄位索引 (Excel 欄位從 1 開始，前三欄是基本資料，所以是 index + 4)
    dateColumns.push({
      dateStr,
      isHoliday,
      colIndex: index + 4,
    });
  });

  // 1-2. 加入統計欄位
  holidayHeaderRowData.push("例", "休", "國");
  headerRow1Data.push("", "", "");
  headerRow2Data.push("", "", "");

  // 1-3. 寫入標題並設定樣式
  const holidayHeaderRow = worksheet.addRow(holidayHeaderRowData);
  const headerRow1 = worksheet.addRow(headerRow1Data);
  const headerRow2 = worksheet.addRow(headerRow2Data);
  holidayHeaderRow.height = 20;
  headerRow1.height = 20;
  headerRow2.height = 20;

  // 1-4. 合併儲存格
  worksheet.mergeCells("A1:A3");
  worksheet.mergeCells("B1:B3");
  worksheet.mergeCells("C1:C3");
  const statsColStart = 4 + daysInMonth;
  worksheet.mergeCells(1, statsColStart, 3, statsColStart); // 例
  worksheet.mergeCells(1, statsColStart + 1, 3, statsColStart + 1); // 休
  worksheet.mergeCells(1, statsColStart + 2, 3, statsColStart + 2); // 國

  // 1-5. 設定標題樣式
  [holidayHeaderRow, headerRow1, headerRow2].forEach((headerRowObj) => {
    headerRowObj.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.HEADER_BG },
      };
      cell.font = {
        name: "Arial",
        color: { argb: COLORS.HEADER_TEXT },
        bold: true,
        size: 10,
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: COLORS.BORDER } },
        left: { style: "thin", color: { argb: COLORS.BORDER } },
        bottom: { style: "thin", color: { argb: COLORS.BORDER } },
        right: { style: "thin", color: { argb: COLORS.BORDER } },
      };
    });
  });

  const addStaffRow = (staff: Staff) => {
    const rowData: (string | number)[] = [staff.id, staff.name, staff.title];

    // 統計計數器
    let countRegular = 0;
    let countLeave = 0;
    let countNational = 0;

    // 填入每日班別
    daysArray.forEach((day) => {
      const dayStr = String(day).padStart(2, "0");
      const shift = schedules[yearMonthKey]?.[staff.id]?.[dayStr] || "";

      rowData.push(shift);

      // 計算統計
      if (shift === "例") countRegular++;
      if (shift === "休") countLeave++;
      if (shift === "國") countNational++;
    });

    // 填入統計數據
    rowData.push(countRegular, countLeave, countNational);

    const row = worksheet.addRow(rowData);

    // 3. 設定資料列樣式與條件格式
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: COLORS.BORDER } },
        left: { style: "thin", color: { argb: COLORS.BORDER } },
        bottom: { style: "thin", color: { argb: COLORS.BORDER } },
        right: { style: "thin", color: { argb: COLORS.BORDER } },
      };

      // A. 處理假日欄位背景色 (若是日期欄位且是假日)
      // 注意：ExcelJS 欄位 index 從 1 開始
      if (colNumber > 3 && colNumber <= 3 + daysInMonth) {
        const colInfo = dateColumns[colNumber - 4]; // -4 回推 array index
        if (colInfo.isHoliday) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: COLORS.HOLIDAY_COL_BG },
          };
        }
      }

      // B. 條件格式 (依照班別內容覆蓋背景色)
      const val = cell.value?.toString();
      let shiftColor = null;

      if (val === "例") shiftColor = COLORS.SHIFT_REGULAR;
      else if (val === "國") shiftColor = COLORS.SHIFT_NATIONAL;
      else if (val === "早") shiftColor = COLORS.SHIFT_MORNING;
      else if (val === "晚") shiftColor = COLORS.SHIFT_NIGHT;
      else if (val === "全") shiftColor = COLORS.SHIFT_FULL;

      if (shiftColor) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: shiftColor },
        };
      }
    });
  };

  // 2. 寫入員工資料列 (含分組)
  const groupedStaffIds = new Set(groups.flatMap((g) => g.memberIds));
  const ungroupedStaff = staffList.filter((s) => !groupedStaffIds.has(s.id));

  // 渲染分組員工
  groups.forEach((group) => {
    const groupStaff = staffList.filter((s) => group.memberIds.includes(s.id));
    const sortedGroupStaff = sortStaffList(groupStaff);

    if (sortedGroupStaff.length === 0) return;

    // Add group header row
    const groupHeaderRow = worksheet.addRow([`--- ${group.name} ---`]);
    worksheet.mergeCells(
      groupHeaderRow.number,
      1,
      groupHeaderRow.number,
      3 + daysInMonth + 3,
    );
    groupHeaderRow.getCell(1).style = {
      font: {
        bold: true,
        name: "Arial",
        size: 10,
        color: { argb: "FF555555" },
      },
      alignment: { vertical: "middle", horizontal: "left", indent: 1 },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      },
    };
    groupHeaderRow.height = 22;

    sortedGroupStaff.forEach(addStaffRow);
  });

  // 渲染未分組員工
  if (ungroupedStaff.length > 0) {
    const ungroupedHeaderRow = worksheet.addRow([
      "--- 未分組人員 (Ungrouped) ---",
    ]);
    worksheet.mergeCells(
      ungroupedHeaderRow.number,
      1,
      ungroupedHeaderRow.number,
      3 + daysInMonth + 3,
    );
    ungroupedHeaderRow.getCell(1).style = {
      font: {
        bold: true,
        name: "Arial",
        size: 10,
        color: { argb: "FF555555" },
      },
      alignment: { vertical: "middle", horizontal: "left", indent: 1 },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      },
    };
    ungroupedHeaderRow.height = 22;

    sortStaffList(ungroupedStaff).forEach(addStaffRow);
  }
  // 4. 設定欄寬
  worksheet.getColumn(1).width = 10; // 工號
  worksheet.getColumn(2).width = 12; // 姓名
  worksheet.getColumn(3).width = 12; // 職稱

  // 日期欄位寬度
  for (let i = 4; i <= 3 + daysInMonth; i++) {
    worksheet.getColumn(i).width = 6;
  }

  // 統計欄位寬度
  worksheet.getColumn(4 + daysInMonth).width = 5; // 例
  worksheet.getColumn(5 + daysInMonth).width = 5; // 休
  worksheet.getColumn(6 + daysInMonth).width = 5; // 國
};
