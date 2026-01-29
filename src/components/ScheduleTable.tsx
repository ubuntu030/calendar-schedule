import { useMemo } from "react";

import { AlertTriangle } from "lucide-react";
import { cn, getDaysInMonth, sortStaff } from "../utils";
import { SHIFT_OPTIONS } from "../constants";

// --- 組件：排班主表 ---
const ScheduleTable = ({
  currentMonth,
  staffList,
  schedules,
  onUpdateShift,
  holidays,
}: {
  currentMonth: string;
  staffList: any[];
  schedules: any;
  onUpdateShift: any;
  holidays: any[];
}) => {
  // 計算日期
  const days = useMemo(() => {
    const [year, month] = currentMonth.split("-").map(Number);
    return getDaysInMonth(year, month);
  }, [currentMonth]);

  // 排序員工
  const sortedStaff = useMemo(() => sortStaff(staffList), [staffList]);

  // 工具：轉換日期物件為 YYYY-MM-DD (本地時間)
  // 修正說明：原先使用 toISOString() 會轉為 UTC，導致台灣時區(UTC+8)的日期少一天
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 取得該日節日資訊
  const getHoliday = (dateObj: Date) => {
    const dateStr = formatDate(dateObj);
    return holidays.find((h: any) => h.date === dateStr);
  };

  // 規則引擎：檢查人力
  const checkRules = (dateStr: string) => {
    const holiday = holidays.find((h: any) => h.date === dateStr);
    // 僅檢查「放假 (isOff='2')」的日子
    if (!holiday || holiday.isOff !== "2") return { pass: true };

    const workers = sortedStaff.filter((staff) => {
      const shift =
        schedules[currentMonth]?.[staff.id]?.[dateStr.split("-")[2]] || "";
      return shift && shift !== "休" && shift !== "例";
    });

    const hasChef = workers.some(
      (w) => w.title.includes("Chef") || w.title.includes("Sous"),
    );

    if (workers.length < 2) return { pass: false, msg: "人力不足" };
    if (!hasChef) return { pass: false, msg: "缺主廚" };

    return { pass: true };
  };

  return (
    <div className="flex-1 overflow-auto border rounded-lg shadow-inner bg-white relative">
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-30 bg-white shadow-sm">
          {/* 1. 節日資訊列 */}
          <tr>
            <th className="sticky left-0 top-0 z-40 bg-slate-50 border-b border-r min-w-[140px] p-2 text-left text-xs font-normal text-gray-500">
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} /> 規則提示
              </div>
            </th>
            {days.map((d) => {
              const dateStr = formatDate(d); // 使用修正後的本地日期字串
              const holiday = getHoliday(d);
              const rule = checkRules(dateStr);
              return (
                <th
                  key={d.toISOString()}
                  className={cn(
                    "border-b border-r text-xs relative h-10 min-w-[48px] transition-colors",
                    holiday?.color || "bg-slate-50",
                  )}
                >
                  <div className="font-bold text-[10px] leading-tight px-1 truncate">
                    {holiday?.name}
                  </div>
                  {!rule.pass && (
                    <div className="absolute -top-3 left-0 w-full flex justify-center z-50">
                      <span className="bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow flex items-center gap-0.5 whitespace-nowrap animate-pulse">
                        {rule.msg}
                      </span>
                    </div>
                  )}
                </th>
              );
            })}
          </tr>

          {/* 2. 日期列 */}
          <tr className="bg-slate-800 text-white">
            <th className="sticky left-0 top-10 z-40 bg-slate-800 p-2 text-left border-r border-slate-600">
              員工 (職稱)
            </th>
            {days.map((d) => (
              <th
                key={d.toISOString()}
                className="border-r border-slate-600 p-1 text-center font-mono w-12"
              >
                <div className="text-sm font-bold">{d.getDate()}</div>
                <div className="text-[10px] opacity-60">
                  {["日", "一", "二", "三", "四", "五", "六"][d.getDay()]}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {/* 3. 排班內容 */}
        <tbody>
          {sortedStaff.map((staff) => (
            <tr
              key={staff.id}
              className="hover:bg-blue-50 group transition-colors"
            >
              <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50 border-r border-b p-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">{staff.name}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-mono",
                      staff.title === "Chef"
                        ? "bg-red-100 text-red-700"
                        : staff.title === "PT"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {staff.title}
                  </span>
                </div>
              </td>
              {days.map((d) => {
                const dayStr = String(d.getDate()).padStart(2, "0");
                const dateStr = formatDate(d); // 使用修正後的本地日期字串
                const shiftValue =
                  schedules[currentMonth]?.[staff.id]?.[dayStr] || "";
                const holiday = getHoliday(d);
                const shiftConfig = SHIFT_OPTIONS.find(
                  (s) => s.value === shiftValue,
                );

                // 背景色邏輯：有排班顯排班色，沒排班顯假日色
                const cellBg = shiftConfig?.value
                  ? shiftConfig.color
                  : holiday?.color?.split(" ")[0] || "";

                return (
                  <td
                    key={d.toISOString()}
                    className={cn(
                      "border-r border-b p-0 relative h-12",
                      cellBg,
                    )}
                  >
                    <select
                      value={shiftValue}
                      onChange={(e) =>
                        onUpdateShift(staff.id, dayStr, e.target.value)
                      }
                      className="w-full h-full bg-transparent text-center appearance-none cursor-pointer focus:outline-none focus:bg-white/50 font-bold text-sm z-10 relative"
                      style={{ textAlignLast: "center" }}
                    >
                      {SHIFT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default ScheduleTable;
