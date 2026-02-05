import { useState } from "react";
import "./App.css";

import { Tabs, Tab, Box, Button } from "@mui/material";
import {
  Calendar,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  Layers,
  FileText,
  Database,
  DownloadCloud,
} from "lucide-react";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { addMonths, subMonths, format } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import {
  GroupManager,
  HolidayManager,
  ScheduleTable,
  StaffManager,
  DataManager,
  ShiftManager,
} from "./components/SubComponent";
import { DEFAULT_MONTH_CONFIG } from "./constants";
import { exportAnnualScheduleToExcel } from "./utils/excelExport";
import { ScheduleProvider, useSchedule } from "./ScheduleContext";
// [Refactor] 引入 Context Provider 和 Hook

// [Refactor] 將主要邏輯抽離為子組件，以便使用 useSchedule Hook
function AppContent() {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  // [Refactor] 從 Context 取得所有需要的資料
  const { staffList, groups, schedules, holidays, monthlyConfig } =
    useSchedule();

  const handlePrevMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  };

  // --- 新增：處理 Excel 匯出 ---
  const handleExportExcel = async () => {
    const year = currentDate.getFullYear();
    try {
      // 顯示簡易的 Loading 提示 (可選)
      // alert("正在生成 Excel，請稍候...");

      await exportAnnualScheduleToExcel(
        year,
        staffList,
        schedules,
        holidays,
        groups,
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert("匯出失敗，請檢查資料是否完整");
    }
  };

  // 取得當月假別設定
  const currentMonthStr = format(currentDate, "yyyy-MM");
  const mConfig = monthlyConfig[currentMonthStr] || DEFAULT_MONTH_CONFIG;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
        {/* 頂部導航 */}
        <header className="bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                React 智能排班系統
              </h1>
              <p className="text-xs text-slate-500">
                v1.2.0 (Excel Export Support)
              </p>
            </div>
          </div>

          {/* 中間：月份切換 */}
          <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-lg">
            <Button
              size="small"
              startIcon={<ChevronLeft size={16} />}
              onClick={handlePrevMonth}
            >
              上個月
            </Button>
            <DatePicker
              views={["year", "month"]}
              value={currentDate}
              onChange={(newDate) => newDate && setCurrentDate(newDate)}
              slotProps={{
                textField: {
                  variant: "standard",
                  InputProps: {
                    disableUnderline: true,
                    className: "font-bold text-slate-700 mx-2",
                  },
                },
              }}
            />
            <Button
              size="small"
              endIcon={<ChevronRight size={16} />}
              onClick={handleNextMonth}
            >
              下個月
            </Button>
          </div>

          {/* 右側：功能按鈕區 */}
          <div>
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadCloud size={18} />}
              onClick={handleExportExcel}
              className="shadow-md hover:bg-green-700 bg-green-600"
              sx={{
                fontWeight: "bold",
                textTransform: "none",
                borderRadius: 2,
              }}
            >
              匯出年度 Excel
            </Button>
          </div>
        </header>

        {/* 主要內容區 */}
        <main className="max-w-350 mx-auto mt-6 px-4">
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(_, v) => setCurrentTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="app tabs"
            >
              <Tab
                icon={<Calendar size={18} />}
                iconPosition="start"
                label="排班總表"
              />
              <Tab
                icon={<Layers size={18} />}
                iconPosition="start"
                label="分組設定"
              />
              <Tab
                icon={<Users size={18} />}
                iconPosition="start"
                label="人員管理"
              />
              <Tab
                icon={<FileText size={18} />}
                iconPosition="start"
                label="假別管理"
              />
              <Tab
                icon={<Settings size={18} />}
                iconPosition="start"
                label="節日與規則"
              />
              <Tab
                icon={<Database size={18} />}
                iconPosition="start"
                label="資料管理"
              />
            </Tabs>
          </Box>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 min-h-150 flex flex-col">
            {currentTab === 0 && (
              <div className="p-0 flex-1 flex flex-col">
                <div className="p-4 bg-blue-50/50 border-b flex justify-between items-center text-sm text-blue-800">
                  <div className="flex gap-4 items-center overflow-x-auto">
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="w-3 h-3 bg-red-500 rounded-sm"></span>{" "}
                      國定假日 (禁休/雙薪)
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="w-3 h-3 bg-red-50 rounded-sm border border-red-200"></span>{" "}
                      週末
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <span className="w-3 h-3 bg-slate-800 rounded-full"></span>{" "}
                      人力警告 (閃爍)
                    </span>
                    <div className="h-4 w-px bg-blue-300 mx-2"></div>
                    <span className="font-bold text-blue-900 flex items-center gap-2 shrink-0">
                      本月假別(天):
                      <span className="font-mono bg-white px-2 py-0.5 rounded text-blue-600 border border-blue-200 shadow-sm">
                        例:{mConfig.regular} 休:{mConfig.leave} 國:
                        {mConfig.national}
                      </span>
                    </span>
                  </div>
                  <div className="shrink-0 ml-4">
                    目前員工數: {staffList.length} 人
                  </div>
                </div>
                <ScheduleTable
                  currentMonth={format(currentDate, "yyyy-MM")}
                  // [Refactor] 不再需要傳遞資料 Props
                />
              </div>
            )}
            {currentTab === 1 && (
              // [Refactor] 組件內部自行使用 Context
              <GroupManager />
            )}
            {currentTab === 2 && <StaffManager />}
            {currentTab === 3 && (
              <ShiftManager currentMonth={format(currentDate, "yyyy-MM")} />
            )}
            {currentTab === 4 && <HolidayManager />}
            {currentTab === 5 && <DataManager />}
          </div>
        </main>
      </div>
    </LocalizationProvider>
  );
}

// [Refactor] 根組件負責提供 Context
export default function App() {
  return (
    <ScheduleProvider>
      <AppContent />
    </ScheduleProvider>
  );
}
