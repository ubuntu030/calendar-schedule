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
} from "./components/SubComponent";

export default function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 初始資料
  const [staffList, setStaffList] = useState([
    { id: "200043", name: "廖仁彥", title: "Chef" },
    { id: "190098", name: "羅雅今", title: "CDP" },
    { id: "210028", name: "蔡幸秀", title: "Commis" },
    { id: "240014", name: "柳家豪", title: "CDP" },
    { id: "220006", name: "黃瀚祈", title: "Demi CDP" },
    { id: "220032", name: "陳麗幸", title: "Commis" },
    { id: "230023", name: "鄭博容", title: "Commis" },
    { id: "N250022", name: "張心嵐", title: "Inter" },
    { id: "PT001", name: "鄭淨文", title: "PT" },
    { id: "170142", name: "郭宜樺", title: "Sous chef" },
    { id: "220070", name: "趙子晴", title: "CDP" },
    { id: "210026", name: "湯美君", title: "Commis" },
    { id: "N260005", name: "李晉丞", title: "Inter" },
  ]);

  // 分組資料狀態
  const [groups, setGroups] = useState([
    {
      id: "g1",
      name: "早班 (甜點)",
      memberIds: ["200043", "190098", "210028"],
    },
    {
      id: "g2",
      name: "晚班 (甜點)",
      memberIds: ["240014", "220006", "220032", "230023", "N250022", "PT001"],
    },
    {
      id: "g3",
      name: "麵包部",
      memberIds: ["170142", "220070", "210026", "N260005"],
    },
  ]);

  const [schedules, setSchedules] = useState({});
  const [holidays, setHolidays] = useState([]);

  // 更新排班
  const handleUpdateShift = (staffId: string, day: string, value: string) => {
    const currentMonthString = format(currentDate, "yyyy-MM");
    setSchedules((prev: Record<string, any>) => {
      const monthData = prev[currentMonthString] || {};
      const staffData = monthData[staffId] || {};
      return {
        ...prev,
        [currentMonthString]: {
          ...monthData,
          [staffId]: { ...staffData, [day]: value },
        },
      };
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  };

  return (
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
              v1.1.0 (Groups + TypeScript JSDoc)
            </p>
          </div>
        </div>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhTW}>
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
        </LocalizationProvider>
      </header>

      {/* 主要內容區 */}
      <main className="max-w-[1400px] mx-auto mt-6 px-4">
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={(e, v) => setCurrentTab(v)}
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
              icon={<Settings size={18} />}
              iconPosition="start"
              label="節日與規則"
            />
          </Tabs>
        </Box>

        <div className="bg-white rounded-xl shadow-lg border min-h-[600px] flex flex-col">
          {currentTab === 0 && (
            <div className="p-0 flex-1 flex flex-col">
              <div className="p-4 bg-blue-50/50 border-b flex justify-between items-center text-sm text-blue-800">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded-sm"></span>{" "}
                    國定假日 (禁休/雙薪)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-50 rounded-sm border border-red-200"></span>{" "}
                    週末
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-slate-800 rounded-full"></span>{" "}
                    人力警告 (閃爍)
                  </span>
                </div>
                <div>目前員工數: {staffList.length} 人</div>
              </div>
              <ScheduleTable
                currentMonth={format(currentDate, "yyyy-MM")}
                staffList={staffList}
                groups={groups}
                schedules={schedules}
                onUpdateShift={handleUpdateShift}
                holidays={holidays}
              />
            </div>
          )}
          {currentTab === 1 && (
            <GroupManager
              groups={groups}
              setGroups={setGroups}
              staffList={staffList}
            />
          )}
          {currentTab === 2 && (
            <StaffManager staffList={staffList} setStaffList={setStaffList} />
          )}
          {currentTab === 3 && (
            <HolidayManager holidays={holidays} setHolidays={setHolidays} />
          )}
        </div>
      </main>
    </div>
  );
}
