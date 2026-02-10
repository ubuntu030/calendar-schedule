import React, { useState, useMemo } from "react";
import {
  TextField,
  Button,
  Card,
  Typography,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  AlertTriangle,
  Save,
  Upload, // Used in HolidayManager and DataManager
  Plus,
  Trash2,
  Layers,
  X,
  Edit,
  Settings,
  Database,
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertCircle,
  MoreVertical,
  Zap,
  ZapOff,
  Eraser,
} from "lucide-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, addMonths, subMonths } from "date-fns";
import type {
  Staff,
  Group,
  Holiday,
  HolidayType,
  MonthConfig,
  Schedules,
  Shift,
} from "../types";
import {
  DEFAULT_MONTH_CONFIG,
  SHIFT_MANAGER_LEAVE_TYPES,
  SHIFT_OPTIONS,
  TITLE_WEIGHTS,
} from "../constants";
import { getTitleColor } from "../utils/style";
import { useSchedule } from "../contexts/ScheduleContext";
import {
  TableHoverContext,
  useTableHover,
} from "../contexts/TableHoverContext";
import { generateAutoLeaves } from "../utils/scheduling";
import { useConfirm } from "../contexts/ConfirmDialogContext";
import { useNotification } from "../contexts/NotificationContext";
// [Refactor] 引入 Context Hook

/**
 * ============================================================================
 * 1. TYPE DEFINITIONS & CONSTANTS (型別定義與常數)
 * ============================================================================
 */

// 工具：取得該月份所有日期物件
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month - 1, 1);
  const days = [];
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// 工具：員工排序邏輯
const sortStaff = (staffList: Staff[]) => {
  return [...staffList].sort((a, b) => {
    const weightA = TITLE_WEIGHTS[a.title as keyof typeof TITLE_WEIGHTS] || 99;
    const weightB = TITLE_WEIGHTS[b.title as keyof typeof TITLE_WEIGHTS] || 99;
    if (weightA !== weightB) return weightA - weightB;
    return a.id.localeCompare(b.id);
  });
};

// 工具：Tailwind Class 合併 (簡易版 clsx)
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter((c): c is string => typeof c === "string").join(" ");

/**
 * ============================================================================
 * 2. SUB-COMPONENTS (子組件層)
 * ============================================================================
 */

/**
 * [Perf] 單一班別儲存格組件
 * 使用 React.memo 優化，僅在相關 props 變更時才重新渲染
 */
const ShiftCell = React.memo(
  ({
    staffId,
    day,
    index,
    currentMonth,
  }: {
    staffId: string;
    day: Date;
    index: number;
    currentMonth: string;
  }) => {
    const { schedules, holidays, setSchedules } = useSchedule();
    const { hoveredColIndex, setHoveredColIndex } = useTableHover();

    const dayStr = String(day.getDate()).padStart(2, "0");
    const shift = schedules[currentMonth]?.[staffId]?.[dayStr];
    const shiftValue = shift?.value || "";
    const isManual = shift?.isManual || false;

    const holiday = useMemo(() => {
      const dateStr = format(day, "yyyy-MM-dd");
      return holidays.find((h) => h.date === dateStr);
    }, [day, holidays]);

    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const shiftConfig = SHIFT_OPTIONS.find((s) => s.value === shiftValue);
    const cellBg = shiftConfig?.value
      ? shiftConfig.color
      : holiday?.color?.split(" ")[0] || (isWeekend ? "bg-red-50" : "");
    const isHovered = hoveredColIndex === index;

    return (
      <td
        className={cn(
          "border-r border-b border-gray-200 p-0 relative h-12",
          cellBg,
          isHovered && "bg-blue-100/50",
        )}
        onMouseEnter={() => setHoveredColIndex(index)}
        onMouseLeave={() => setHoveredColIndex(null)}
      >
        <select
          value={shiftValue}
          onChange={(e) => {
            // 手動修改時，isManual 永遠為 true
            setSchedules((prev) => ({
              ...prev,
              [currentMonth]: {
                ...prev[currentMonth],
                [staffId]: {
                  ...prev[currentMonth]?.[staffId],
                  [dayStr]: { value: e.target.value, isManual: true },
                },
              },
            }));
          }}
          className="w-full h-full bg-transparent text-center appearance-none cursor-pointer focus:outline-none focus:bg-white/50 font-bold text-sm z-10 relative"
          style={{ textAlignLast: "center" }}
        >
          {SHIFT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {isManual && shiftValue && (
          <div
            className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full shadow"
            title="手動設定"
          ></div>
        )}
      </td>
    );
  },
);
ShiftCell.displayName = "ShiftCell";

/**
 * [Perf] 單一員工列組件
 * 使用 React.memo 優化，避免在其他員工資料變更時重新渲染
 */
const StaffRow = React.memo(
  ({
    staff,
    days,
    currentMonth,
  }: {
    staff: Staff;
    days: Date[];
    currentMonth: string;
  }) => {
    const { schedules, monthlyConfig, staffList, setStaffList, setSchedules } =
      useSchedule();
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const confirm = useConfirm();

    // 使用 useMemo 計算休假統計，僅在相關資料變更時才重新計算
    const {
      regularCount,
      leaveCount,
      nationalCount,
      morningCount,
      eveningCount,
      fullCount,
      isOver,
    } = useMemo(() => {
      const staffShifts = schedules[currentMonth]?.[staff.id] || {};
      const counts: Record<string, number> = {
        regular: 0,
        leave: 0,
        national: 0,
        morning: 0,
        evening: 0,
        full: 0,
      };
      (Object.values(staffShifts) as Shift[]).forEach((s: Shift) => {
        const v = s.value;
        if (v === "例") counts.regular++;
        else if (v === "休") counts.leave++;
        else if (v === "國") counts.national++;
        else if (v === "早") counts.morning++;
        else if (v === "晚") counts.evening++;
        else if (v === "全") counts.full++;
      });

      const mConfig = monthlyConfig[currentMonth] || DEFAULT_MONTH_CONFIG;
      const over =
        counts.regular > mConfig.regular ||
        counts.leave > mConfig.leave ||
        counts.national > mConfig.national;

      return {
        regularCount: counts.regular,
        leaveCount: counts.leave,
        nationalCount: counts.national,
        morningCount: counts.morning,
        eveningCount: counts.evening,
        fullCount: counts.full,
        isOver: over,
      };
    }, [schedules, currentMonth, staff.id, monthlyConfig]);

    const mConfig = monthlyConfig[currentMonth] || DEFAULT_MONTH_CONFIG;

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      setMenuAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
      setMenuAnchorEl(null);
    };

    const handleToggleDisableAuto = () => {
      setStaffList(
        staffList.map((s) =>
          s.id === staff.id ? { ...s, disableAuto: !s.disableAuto } : s,
        ),
      );
      handleMenuClose();
    };

    const handleClearAutoShifts = () => {
      confirm({
        title: "清除自動排班",
        description: `確定要清除 ${staff.name} 於 ${currentMonth} 的所有「自動」排班資料嗎？`,
        onConfirm: () => {
          setSchedules((prev) => {
            const newSchedules = { ...prev };
            if (!newSchedules[currentMonth]?.[staff.id]) return prev;

            const newStaffSchedule: { [day: string]: Shift } = {};
            for (const day in newSchedules[currentMonth][staff.id]) {
              if (newSchedules[currentMonth][staff.id][day].isManual) {
                newStaffSchedule[day] =
                  newSchedules[currentMonth][staff.id][day];
              }
            }
            newSchedules[currentMonth][staff.id] = newStaffSchedule;
            return newSchedules;
          });
          handleMenuClose();
        },
      });
    };

    const handlePersonalAutoSchedule = () => {
      document.dispatchEvent(
        new CustomEvent("auto-schedule-personal", {
          detail: { staffId: staff.id, month: currentMonth },
        }),
      );
      handleMenuClose();
    };

    const getStatusColor = (count: number, limit: number) => {
      if (count > limit) return "text-red-300 font-bold";
      if (count === limit) return "text-gray-400";
      return "text-white";
    };

    const TooltipContent = (
      <div className="flex flex-col gap-1 text-xs">
        <div className="text-blue-200 font-bold">早班: {morningCount}</div>
        <div className="text-indigo-200 font-bold">晚班: {eveningCount}</div>
        <div className="text-purple-200 font-bold">全日: {fullCount}</div>
        <div className="my-1 border-t border-gray-600"></div>
        <div className={getStatusColor(regularCount, mConfig.regular)}>
          例: {regularCount}/{mConfig.regular}
        </div>
        <div className={getStatusColor(leaveCount, mConfig.leave)}>
          休: {leaveCount}/{mConfig.leave}
        </div>
        <div className={getStatusColor(nationalCount, mConfig.national)}>
          國: {nationalCount}/{mConfig.national}
        </div>
      </div>
    );

    return (
      <tr className="hover:bg-blue-50/50 group transition-colors">
        <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/50 border-r border-b border-gray-200 p-2 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Tooltip title={TooltipContent} arrow placement="right">
                <div className="flex items-center gap-1 cursor-help">
                  <span className="font-bold text-slate-700">{staff.name}</span>
                  {isOver && (
                    <div className="text-red-500 flex items-center">
                      <AlertCircle size={14} />
                    </div>
                  )}
                </div>
              </Tooltip>
            </div>
            <div className="flex items-center">
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-mono",
                  getTitleColor(staff.title),
                )}
              >
                {staff.title}
              </span>
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                className="ml-1"
              >
                <MoreVertical size={16} />
              </IconButton>
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handlePersonalAutoSchedule}>
                  <ListItemIcon>
                    <Zap size={16} />
                  </ListItemIcon>
                  <ListItemText>個人自動排休</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleToggleDisableAuto}>
                  <ListItemIcon>
                    {staff.disableAuto ? (
                      <ZapOff size={16} color="red" />
                    ) : (
                      <ZapOff size={16} />
                    )}
                  </ListItemIcon>
                  <ListItemText>
                    {staff.disableAuto ? "啟用自動排休" : "禁用自動排休"}
                  </ListItemText>
                </MenuItem>
                <MenuItem onClick={handleClearAutoShifts}>
                  <ListItemIcon>
                    <Eraser size={16} />
                  </ListItemIcon>
                  <ListItemText>清除本月自動排班</ListItemText>
                </MenuItem>
              </Menu>
            </div>
          </div>
        </td>
        {days.map((d, index) => (
          <ShiftCell
            key={d.toISOString()}
            staffId={staff.id}
            day={d}
            index={index}
            currentMonth={currentMonth}
          />
        ))}
      </tr>
    );
  },
);
StaffRow.displayName = "StaffRow";

/**
 * [Perf] 表格頭部組件
 * 使用 React.memo 優化，避免在班表資料變更時重新渲染
 */
const ScheduleHeader = React.memo(
  ({ days, currentMonth }: { days: Date[]; currentMonth: string }) => {
    const { staffList, schedules, holidays } = useSchedule();
    const { hoveredColIndex, setHoveredColIndex } = useTableHover();

    const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

    const getHoliday = (dateObj: Date) => {
      const dateStr = formatDate(dateObj);
      return holidays.find((h) => h.date === dateStr);
    };

    const checkRules = (dateStr: string) => {
      const holiday: Holiday | undefined = holidays.find(
        (h) => h.date === dateStr,
      );
      if (!holiday || holiday.isOff !== "2") return { pass: true };
      const workers = staffList.filter((staff) => {
        const shift =
          schedules[currentMonth]?.[staff.id]?.[dateStr.split("-")[2]]?.value;
        return shift && !["休", "例", "國", ""].includes(shift);
      });
      const hasChef = workers.some(
        (w) => w.title.includes("Chef") || w.title.includes("Sous"),
      );
      if (workers.length < 2) return { pass: false, msg: "人力不足" };
      if (!hasChef) return { pass: false, msg: "缺主廚" };
      return { pass: true };
    };

    return (
      <thead className="sticky top-0 z-30 bg-white shadow-sm">
        {/* 節日資訊列 */}
        <tr>
          <th className="sticky left-0 top-0 z-40 bg-slate-50 border-b border-r border-gray-200 min-w-45 p-2 text-left text-xs font-normal text-gray-500">
            <div className="flex items-center justify-between">
              <Tooltip
                title={
                  <div className="text-xs">
                    <div className="font-bold mb-1">排班規則 (僅國定假日):</div>
                    <ul className="list-disc pl-4">
                      <li>上班人數需 2 人以上</li>
                      <li>需包含 Chef 或 Sous chef</li>
                    </ul>
                  </div>
                }
                arrow
                placement="right"
              >
                <div className="flex items-center gap-1 cursor-help w-fit">
                  <AlertTriangle size={12} /> 規則提示
                </div>
              </Tooltip>
              <Button
                size="small"
                variant="text"
                startIcon={<Zap size={14} />}
                onClick={() =>
                  document.dispatchEvent(
                    new CustomEvent("auto-schedule-all", {
                      detail: { month: currentMonth },
                    }),
                  )
                }
                className="text-blue-600 font-bold"
              >
                自動排休
              </Button>
            </div>
          </th>
          {days.map((d, index) => {
            const dateStr = formatDate(d);
            const holiday = getHoliday(d);
            const rule = checkRules(dateStr);
            const isHovered = hoveredColIndex === index;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <th
                key={d.toISOString()}
                className={cn(
                  "border-b border-r border-gray-200 text-xs relative h-10 min-w-12 transition-colors",
                  holiday?.color ||
                    (isWeekend ? "bg-red-50 text-red-500" : "bg-slate-50"),
                  isHovered && "bg-blue-50",
                )}
                onMouseEnter={() => setHoveredColIndex(index)}
                onMouseLeave={() => setHoveredColIndex(null)}
              >
                <div className="font-bold text-[10px] leading-tight px-1 truncate">
                  {holiday?.name}
                </div>
                {!rule.pass && (
                  <div className="absolute left-0 w-full flex justify-center z-50">
                    <span className="bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow flex items-center gap-0.5 whitespace-nowrap animate-pulse">
                      {rule.msg}
                    </span>
                  </div>
                )}
              </th>
            );
          })}
        </tr>
        {/* 日期列 */}
        <tr className="bg-slate-800 text-white">
          <th className="sticky left-0 top-10 z-40 bg-slate-800 p-2 text-left border-r border-slate-600">
            員工 (職稱)
          </th>
          {days.map((d) => {
            const dayStr = String(d.getDate()).padStart(2, "0");
            const summary: Record<string, string[]> = {};
            staffList.forEach((staff) => {
              const val = schedules[currentMonth]?.[staff.id]?.[dayStr]?.value;
              if (val) {
                if (!summary[val]) summary[val] = [];
                summary[val].push(staff.name);
              }
            });

            const TooltipContent = (
              <div className="flex flex-col gap-1 text-xs">
                {SHIFT_OPTIONS.filter(
                  (opt) => opt.value && summary[opt.value]?.length > 0,
                ).map((opt) => {
                  let textColor = "text-white";
                  if (opt.value === "早") textColor = "text-blue-300";
                  if (opt.value === "晚") textColor = "text-indigo-300";
                  if (opt.value === "全") textColor = "text-purple-300";
                  if (opt.value === "國") textColor = "text-orange-300";
                  if (opt.value === "例") textColor = "text-gray-400";
                  if (opt.value === "休") textColor = "text-gray-200";

                  return (
                    <div key={opt.value}>
                      <span className={cn("font-bold", textColor)}>
                        {opt.label} ({summary[opt.value].length}):
                      </span>{" "}
                      <span className="text-gray-300">
                        {summary[opt.value].join("、")}
                      </span>
                    </div>
                  );
                })}
                {Object.keys(summary).length === 0 && <div>無排班</div>}
              </div>
            );

            return (
              <Tooltip
                key={d.toISOString()}
                title={TooltipContent}
                arrow
                placement="top"
              >
                <th className="border-r border-slate-600 p-1 text-center font-mono w-12 cursor-help hover:bg-slate-700 transition-colors">
                  <div className="text-sm font-bold">{d.getDate()}</div>
                  <div className="text-[10px] opacity-60">
                    {["日", "一", "二", "三", "四", "五", "六"][d.getDay()]}
                  </div>
                </th>
              </Tooltip>
            );
          })}
        </tr>
      </thead>
    );
  },
);
ScheduleHeader.displayName = "ScheduleHeader";

/**
 * [Perf] 重構後的排班主表組件
 * 內部使用 memoized 子組件來優化性能
 *
 * @param {Object} props
 * @param {string} props.currentMonth - 當前月份 (YYYY-MM)
 */
const ScheduleTable = ({ currentMonth }: { currentMonth: string }) => {
  const { staffList, groups, schedules, setSchedules, monthlyConfig } =
    useSchedule();
  const confirm = useConfirm();
  const [hoveredColIndex, setHoveredColIndex] = useState<number | null>(null);

  // [Perf] 將 hover 狀態放入 context，避免整個 table re-render
  const hoverContextValue = useMemo(
    () => ({ hoveredColIndex, setHoveredColIndex }),
    [hoveredColIndex],
  );

  // 計算當月日期
  const days = useMemo(() => {
    const [year, month] = currentMonth.split("-").map(Number);
    return getDaysInMonth(year, month);
  }, [currentMonth]);

  // --- 自動排休演算法 ---
  const autoDistributeLeave = (targetStaffIds: string[], month: string) => {
    const mConfig = monthlyConfig[month] || DEFAULT_MONTH_CONFIG;

    setSchedules((currentSchedules) => {
      return generateAutoLeaves(
        currentSchedules,
        staffList,
        groups,
        mConfig,
        targetStaffIds,
        month,
      );
    });
  };

  const handleClearGroupAutoShifts = (
    targetStaffIds: string[],
    month: string,
  ) => {
    confirm({
      title: "清除組內自動排休",
      description: `確定要清除此分組於 ${month} 的所有「自動」排休資料嗎？`,
      onConfirm: () => {
        setSchedules((prev) => {
          const newSchedules = JSON.parse(JSON.stringify(prev));

          targetStaffIds.forEach((staffId) => {
            if (newSchedules[month]?.[staffId]) {
              const staffSchedule = newSchedules[month][staffId];
              Object.keys(staffSchedule).forEach((day) => {
                const shift = staffSchedule[day];
                // 僅清空 isManual=false 的休、例、國
                if (
                  !shift.isManual &&
                  ["例", "休", "國"].includes(shift.value)
                ) {
                  delete staffSchedule[day];
                }
              });
            }
          });

          return newSchedules;
        });
      },
    });
  };

  // 使用 Event Listener 處理來自子組件的觸發，避免 props drilling 破壞 memo
  React.useEffect(() => {
    const handleAll = (e: Event) =>
      autoDistributeLeave(
        staffList.map((s) => s.id),
        (e as CustomEvent).detail.month,
      );
    const handlePersonal = (e: Event) =>
      autoDistributeLeave(
        [(e as CustomEvent).detail.staffId],
        (e as CustomEvent).detail.month,
      );
    document.addEventListener("auto-schedule-all", handleAll);
    document.addEventListener("auto-schedule-personal", handlePersonal);
    return () => {
      document.removeEventListener("auto-schedule-all", handleAll);
      document.removeEventListener("auto-schedule-personal", handlePersonal);
    };
  }, [staffList, groups, schedules, monthlyConfig]); // 依賴項確保函數能取到最新 state

  // --- 分組渲染邏輯 ---
  // 1. 找出所有已分組的 ID
  const groupedStaffIds = new Set(groups.flatMap((g: Group) => g.memberIds));

  // 2. 找出未分組的員工
  const ungroupedStaff = staffList.filter((s) => !groupedStaffIds.has(s.id));

  return (
    <TableHoverContext.Provider value={hoverContextValue}>
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg shadow-inner bg-white relative">
        <table className="min-w-full border-collapse text-sm">
          <ScheduleHeader days={days} currentMonth={currentMonth} />
          <tbody>
            {groups.map((group) => {
              const groupStaff = staffList.filter((s) =>
                group.memberIds.includes(s.id),
              );
              const sortedGroupStaff = sortStaff(groupStaff);
              if (sortedGroupStaff.length === 0) return null;
              return (
                <React.Fragment key={group.id}>
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      className="h-6 bg-slate-100 border-b border-t border-gray-200 text-xs text-slate-400 font-bold tracking-wider"
                    >
                      <div className="flex justify-start items-center pl-4">
                        <span>--- {group.name} ---</span>
                        <div className="flex items-center">
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<Zap size={14} />}
                            onClick={() =>
                              autoDistributeLeave(group.memberIds, currentMonth)
                            }
                            className="text-blue-600 font-bold"
                          >
                            組內排休
                          </Button>
                          <Tooltip title="清除組內自動排休">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleClearGroupAutoShifts(
                                  group.memberIds,
                                  currentMonth,
                                )
                              }
                              className="text-gray-400 hover:text-red-500 ml-1 mr-2"
                            >
                              <Eraser size={14} />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {sortedGroupStaff.map((staff) => (
                    <StaffRow
                      key={staff.id}
                      staff={staff}
                      days={days}
                      currentMonth={currentMonth}
                    />
                  ))}
                </React.Fragment>
              );
            })}
            {ungroupedStaff.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={days.length + 1}
                    className="h-6 bg-slate-100 border-b border-t text-xs text-slate-400 pl-4 font-bold tracking-wider"
                  >
                    --- 未分組人員 (Ungrouped) ---
                  </td>
                </tr>
                {sortStaff(ungroupedStaff).map((staff) => (
                  <StaffRow
                    key={staff.id}
                    staff={staff}
                    days={days}
                    currentMonth={currentMonth}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </TableHoverContext.Provider>
  );
};

/**
 * 分組管理組件
 * 提供群組的新增、更名、成員管理功能
 * [Refactor] 移除 Props，改用 Context
 * @returns {JSX.Element} GroupManager Component
 */
const GroupManager = () => {
  // [Refactor] 從 Context 取得資料
  const { groups, setGroups, staffList } = useSchedule();
  const confirm = useConfirm();

  const [newGroupName, setNewGroupName] = useState("");

  // 新增群組
  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: Group = {
      id: `g_${Date.now()}`,
      name: newGroupName,
      memberIds: [],
      minStaffCount: 2, // 預設最低人力為 1
    };
    setGroups([...groups, newGroup]);
    setNewGroupName("");
  };

  // 刪除群組
  const handleDeleteGroup = (groupId: string) => {
    confirm({
      title: "刪除群組",
      description: "確定刪除此群組？成員將變為未分組狀態。",
      onConfirm: () => {
        setGroups(groups.filter((g) => g.id !== groupId));
      },
    });
  };

  // 更新群組資料
  const handleUpdateGroup = (
    groupId: string,
    updates: Partial<Pick<Group, "name" | "minStaffCount">>,
  ) => {
    setGroups(groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)));
  };

  // 加入成員到群組 (需處理 Exclusive Logic: 從其他群組移除)
  const handleAddMember = (groupId: string, staffId: string) => {
    setGroups((prevGroups: Group[]) => {
      // 1. 先從所有群組中移除該 staffId
      const clearedGroups = prevGroups.map((g: Group) => ({
        ...g,
        memberIds: g.memberIds.filter((id: string) => id !== staffId),
      }));

      // 2. 加入到目標群組
      return clearedGroups.map((g: Group) =>
        g.id === groupId
          ? {
              ...g,
              memberIds: [...g.memberIds, staffId],
            }
          : g,
      );
    });
  };

  // 移除成員
  const handleRemoveMember = (groupId: string, staffId: string) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              memberIds: g.memberIds.filter((id: string) => id !== staffId),
            }
          : g,
      ),
    );
  };

  // 取得尚未加入該群組的員工列表 (可以是所有人，因為我們支援自動移動)
  // 為了 UX，我們顯示「未分組」的人優先，或標記目前所在組別
  const getStaffOptions = (currentGroupId: string) => {
    // 找出目前在該群組的人，排除掉
    const currentGroup = groups.find((g) => g.id === currentGroupId);
    const existingIds = new Set(currentGroup?.memberIds || []);

    return staffList.filter((s) => !existingIds.has(s.id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto border-gray-200">
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <Typography variant="h6" className="flex items-center gap-2 mb-4">
          <Layers size={20} className="text-blue-600" /> 新增分組
        </Typography>
        <div className="flex gap-4">
          <TextField
            label="群組名稱 (例如: 內場, 外場, 兼職)"
            size="small"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleAddGroup}
            startIcon={<Plus size={18} />}
            className="whitespace-nowrap"
          >
            建立群組
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group) => (
          <Card
            key={group.id}
            className="p-4 bg-slate-50 border border-gray-200 shadow-sm flex flex-col h-100"
          >
            {/* Header: 組名編輯與刪除 */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
              <input
                className="font-bold text-lg bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-slate-800 w-full mr-2"
                value={group.name}
                onChange={(e) =>
                  handleUpdateGroup(group.id, { name: e.target.value })
                }
              />
              <div className="flex items-center gap-2 shrink-0">
                <TextField
                  label="最低人力"
                  type="number"
                  size="small"
                  variant="standard"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: 0, style: { textAlign: "center" } }}
                  className="w-20"
                  value={group.minStaffCount ?? 1}
                  onChange={(e) => {
                    const newCount = parseInt(e.target.value, 10);
                    handleUpdateGroup(group.id, {
                      minStaffCount: isNaN(newCount) ? 1 : newCount,
                    });
                  }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            </div>

            {/* Content: 成員列表 */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
              {group.memberIds.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-sm">
                  尚無成員
                </div>
              ) : (
                group.memberIds.map((id: string) => {
                  const staff = staffList.find((s) => s.id === id);
                  if (!staff) return null;
                  return (
                    <div
                      key={id}
                      className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            staff.title === "Chef" ||
                              staff.title === "Sous chef"
                              ? "bg-red-500"
                              : staff.title === "CDP" ||
                                  staff.title === "Demi CDP"
                                ? "bg-blue-500"
                                : staff.title === "Commis"
                                  ? "bg-green-500"
                                  : staff.title === "Inter"
                                    ? "bg-orange-500"
                                    : staff.title === "PT"
                                      ? "bg-gray-500"
                                      : "bg-slate-400",
                          )}
                        ></span>
                        <span className="font-bold">{staff.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">
                          {staff.title}
                        </span>
                      </div>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMember(group.id, id)}
                      >
                        <X
                          size={14}
                          className="text-gray-400 hover:text-red-500"
                        />
                      </IconButton>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: 新增成員 */}
            <div className="pt-2 border-t border-gray-200">
              <FormControl size="small" fullWidth>
                <InputLabel>加入成員...</InputLabel>
                <Select
                  label="加入成員..."
                  value=""
                  onChange={(e) => handleAddMember(group.id, e.target.value)}
                >
                  {getStaffOptions(group.id).map((s) => {
                    // 檢查這個人是否在其他群組
                    const otherGroup = groups.find(
                      (g) => g.id !== group.id && g.memberIds.includes(s.id),
                    );
                    const label =
                      s.name +
                      (otherGroup ? ` (從 ${otherGroup.name} 移動)` : "");

                    return (
                      <MenuItem key={s.id} value={s.id}>
                        {label}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * 人員管理組件
 * 負責新增、刪除員工，以及設定員工職稱
 * [Refactor] 移除 Props，改用 Context
 * @returns {JSX.Element} StaffManager Component
 */
const StaffManager = () => {
  const { staffList, setStaffList, setGroups, setSchedules } = useSchedule();
  const confirm = useConfirm();

  const [newStaff, setNewStaff] = useState({
    id: "",
    name: "",
    title: "Commis",
  });

  const handleAdd = () => {
    if (!newStaff.id || !newStaff.name) return;
    setStaffList([...staffList, newStaff]);
    setNewStaff({ id: "", name: "", title: "Commis" });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: "刪除員工",
      description: "確定刪除此員工？其所有排班與分組資料將一併被清除。",
      onConfirm: () => {
        // 1. 從 staffList 移除
        setStaffList((prev: Staff[]) => prev.filter((s) => s.id !== id));

        // 2. 從 groups 移除
        setGroups((prevGroups) =>
          prevGroups.map((g) => ({
            ...g,
            memberIds: g.memberIds.filter((memberId) => memberId !== id),
          })),
        );

        // 3. 從 schedules 移除
        setSchedules((prevSchedules: Schedules) => {
          const nextSchedules = { ...prevSchedules };
          Object.keys(nextSchedules).forEach((month) => {
            const monthSchedule = nextSchedules[month];
            if (monthSchedule && id in monthSchedule) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { [id]: deleted, ...remainingStaff } = monthSchedule;
              nextSchedules[month] = remainingStaff;
            }
          });
          return nextSchedules;
        });
      },
    });
  };

  // 預覽排序結果
  const sortedPreview = sortStaff(staffList);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card className="p-4 mb-6 bg-slate-50 border-none shadow-sm">
        <Typography variant="h6" className="mb-4 flex items-center gap-2">
          <Plus size={20} className="text-blue-600" /> 新增員工
        </Typography>
        <div className="flex gap-4 items-end flex-wrap">
          <TextField
            label="員工編號 (ID)"
            size="small"
            variant="outlined"
            className="bg-white"
            value={newStaff.id}
            onChange={(e) => setNewStaff({ ...newStaff, id: e.target.value })}
          />
          <TextField
            label="姓名"
            size="small"
            variant="outlined"
            className="bg-white"
            value={newStaff.name}
            onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
          />
          <FormControl size="small" className="min-w-30 bg-white">
            <InputLabel>職稱</InputLabel>
            <Select
              value={newStaff.title}
              label="職稱"
              onChange={(e) =>
                setNewStaff({ ...newStaff, title: e.target.value })
              }
            >
              {Object.keys(TITLE_WEIGHTS).map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleAdd} disableElevation>
            新增
          </Button>
        </div>
      </Card>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-600 text-sm uppercase font-semibold">
            <tr>
              <th className="p-3">權重排序</th>
              <th className="p-3">職稱</th>
              <th className="p-3">姓名</th>
              <th className="p-3">ID</th>
              <th className="p-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedPreview.map((s, idx) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="p-3 text-slate-400 font-mono text-sm">
                  {idx + 1}
                </td>
                <td className="p-3">
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      getTitleColor(s.title),
                    )}
                  >
                    {s.title}
                  </span>
                </td>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-slate-500 font-mono text-sm">{s.id}</td>
                <td className="p-3 text-right">
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * 節日管理組件
 * 負責新增、編輯、刪除節日，支援 JSON 匯入
 * [Refactor] 移除 Props，改用 Context
 * @returns {JSX.Element} HolidayManager Component
 */
const HolidayManager = () => {
  const { holidays, setHolidays } = useSchedule();
  const { showNotification } = useNotification();

  const [jsonInput, setJsonInput] = useState("");
  const [formData, setFormData] = useState({
    date: "",
    name: "",
    type: "NATIONAL" as HolidayType,
  });

  const handleSaveManual = () => {
    if (!formData.date) {
      showNotification("請選擇日期", "warning");
      return;
    }

    const colorClass =
      formData.type === "NATIONAL"
        ? "bg-red-500 text-white"
        : "bg-red-50 text-red-500";

    const newHoliday: Holiday = {
      date: formData.date,
      name: formData.name,
      isOff: "2",
      color: colorClass,
      type: formData.type,
    };

    setHolidays((prev: Holiday[]) => {
      const filtered = prev.filter((h) => h.date !== formData.date);
      return [...filtered, newHoliday].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    });

    setFormData({ date: "", name: "", type: "NATIONAL" as HolidayType });
  };

  const handleEdit = (h: Holiday) => {
    setFormData({
      date: h.date,
      name: h.name || "",
      type: h.type === "WEEKEND" ? "WEEKEND" : "NATIONAL",
    });
  };

  const handleImport = (onlySpecial = false) => {
    try {
      const parsed = JSON.parse(jsonInput);
      const newHolidays: Holiday[] = parsed
        .filter(
          (item: {
            西元日期: string;
            星期: string;
            是否放假: "0" | "2";
            備註: string;
          }) => {
            if (item.是否放假 !== "2") return false;
            if (onlySpecial && !item.備註) return false;
            return true;
          },
        )
        .map(
          (item: {
            西元日期: string;
            星期: string;
            是否放假: "0" | "2";
            備註: string;
          }) => {
            // 轉換 20260101 -> 2026-01-01
            const d = item.西元日期;
            const dateStr = `${d.substring(0, 4)}-${d.substring(
              4,
              6,
            )}-${d.substring(6, 8)}`;

            let colorClass = "";
            let type: HolidayType = "WEEKEND";

            if (item.備註) {
              colorClass = "bg-red-400 text-white"; // 國定假日
              type = "NATIONAL";
            } else {
              colorClass = "bg-red-50 text-red-500"; // 週末
              type = "WEEKEND";
            }
            return {
              date: dateStr,
              name: item.備註,
              isOff: item.是否放假,
              color: colorClass,
              type,
            };
          },
        );

      // 合併去重
      const merged = [...holidays, ...newHolidays].reduce(
        (acc, curr) => {
          acc[curr.date] = curr;
          return acc;
        },
        {} as { [date: string]: Holiday },
      );

      setHolidays(
        (Object.values(merged) as Holiday[]).sort((a: Holiday, b: Holiday) => {
          return a.date.localeCompare(b.date);
        }),
      );
      showNotification(`成功匯入 ${newHolidays.length} 筆資料`, "success");
      setJsonInput("");
    } catch (e) {
      showNotification("JSON 格式錯誤，請確認", "error");
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <Card className="p-4 bg-white shadow-sm border border-gray-200">
          <Typography variant="h6" className="flex items-center gap-2 mb-4">
            <Plus size={20} className="text-blue-600" /> 手動新增/編輯
          </Typography>
          <Stack spacing={2}>
            <DatePicker
              label="日期"
              value={formData.date ? new Date(formData.date) : null}
              onChange={(newValue) =>
                setFormData({
                  ...formData,
                  date: newValue ? format(newValue, "yyyy-MM-dd") : "",
                })
              }
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
            <TextField
              label="節日名稱 (選填)"
              size="small"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <FormControl size="small" fullWidth>
              <InputLabel>類型</InputLabel>
              <Select
                value={formData.type}
                label="類型"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as HolidayType,
                  })
                }
              >
                <MenuItem value="NATIONAL">國定假日 (紅底白字)</MenuItem>
                <MenuItem value="WEEKEND">週末/其他 (白底紅字)</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSaveManual}
              startIcon={<Save size={16} />}
            >
              儲存節日
            </Button>
          </Stack>
        </Card>

        <div className="space-y-4">
          <Typography variant="h6" className="flex items-center gap-2">
            <Upload size={20} /> JSON 自動匯入
          </Typography>
          <Typography variant="body2" className="text-gray-500">
            支援格式:{" "}
            {`{ "西元日期": "20260101", "是否放假": "2", "備註": "..." }`}
          </Typography>
          <textarea
            className="w-full h-48 p-3 border border-gray-200 rounded-lg font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="在此貼上 JSON..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="contained"
              startIcon={<Save size={16} />}
              onClick={() => handleImport(false)}
              fullWidth
            >
              解析並儲存
            </Button>
            <Button
              variant="outlined"
              startIcon={<Save size={16} />}
              onClick={() => handleImport(true)}
              fullWidth
            >
              解析並儲存 (特殊節日)
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col h-150">
        <div className="bg-slate-100 p-3 font-semibold border-b border-gray-200">
          已登錄節日 ({holidays.length})
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {holidays.length === 0 && (
            <div className="text-center text-gray-400 mt-10">尚無節日資料</div>
          )}
          {holidays.map((h) => (
            <div
              key={h.date}
              className="flex justify-between items-center p-2 border border-gray-200 rounded hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500 text-sm">
                  {h.date}
                </span>
                {h.name && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      h.type === "NATIONAL"
                        ? "bg-red-100 text-red-700 font-bold"
                        : "bg-gray-200"
                    }`}
                  >
                    {h.name}
                  </span>
                )}
                {h.type === "WEEKEND" && (
                  <span className="text-xs text-gray-400">週末</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="small"
                  onClick={() => handleEdit(h)}
                  style={{ minWidth: "30px" }}
                >
                  <Edit size={14} className="text-blue-500" />
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() =>
                    setHolidays((prev: Holiday[]) =>
                      prev.filter((x) => x.date !== h.date),
                    )
                  }
                  style={{ minWidth: "30px" }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 假別天數管理組件
 * 設定每個月的例假、休假、國假天數
 * 支援一次顯示四個月，並可左右切換
 * [Refactor] 移除 config/setConfig Props，保留 currentMonth
 *
 * @param {Object} props
 * @param {string} props.currentMonth - 當前月份 (YYYY-MM)
 */
const ShiftManager = ({ currentMonth }: { currentMonth: string }) => {
  // [Refactor] 從 Context 取得資料
  const { monthlyConfig, setMonthlyConfig } = useSchedule();
  const { showNotification } = useNotification();

  // 本地狀態：顯示的起始月份
  const [startMonthStr, setStartMonthStr] = useState(currentMonth);

  // 當外部 currentMonth 改變時，同步更新起始月份 (可選)
  React.useEffect(() => {
    setStartMonthStr(currentMonth);
  }, [currentMonth]);

  // 輔助：解析 YYYY-MM 為 Date 物件
  const getMonthDate = (str: string) => {
    const [y, m] = str.split("-").map(Number);
    return new Date(y, m - 1, 1);
  };

  const handlePrev = () => {
    const date = getMonthDate(startMonthStr);
    setStartMonthStr(format(subMonths(date, 1), "yyyy-MM"));
  };

  const handleNext = () => {
    const date = getMonthDate(startMonthStr);
    setStartMonthStr(format(addMonths(date, 1), "yyyy-MM"));
  };

  // 計算要顯示的四個月份
  const monthsToDisplay = useMemo(() => {
    const start = getMonthDate(startMonthStr);
    return [0, 1, 2, 3].map((offset) =>
      format(addMonths(start, offset), "yyyy-MM"),
    );
  }, [startMonthStr]);

  const handleChange = (month: string, type: string, val: string) => {
    const num = parseInt(val) || 0;
    const monthConfig: MonthConfig =
      monthlyConfig[month] || DEFAULT_MONTH_CONFIG;
    setMonthlyConfig({
      ...monthlyConfig,
      [month]: {
        ...monthConfig,
        [type]: num,
      },
    });
  };

  // 複製上個月設定
  const handleCopyPrev = (targetMonth: string) => {
    const date = getMonthDate(targetMonth);
    const prevMonthStr = format(subMonths(date, 1), "yyyy-MM");
    const prevConfig = monthlyConfig[prevMonthStr];

    if (prevConfig) {
      setMonthlyConfig({
        ...monthlyConfig,
        [targetMonth]: { ...prevConfig },
      });
    } else {
      showNotification(`找不到上個月 (${prevMonthStr}) 的設定資料`, "warning");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button onClick={handlePrev} startIcon={<ChevronLeft size={20} />}>
          上個月
        </Button>
        <Typography
          variant="h6"
          className="flex items-center gap-2 font-bold text-slate-700"
        >
          <Settings size={20} className="text-blue-600" />
          假別天數設定 ({startMonthStr} ~ {monthsToDisplay[2]})
        </Typography>
        <Button onClick={handleNext} endIcon={<ChevronRight size={20} />}>
          下個月
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {monthsToDisplay.map((month) => {
          const monthConfig = monthlyConfig[month] || DEFAULT_MONTH_CONFIG;
          const totalDays =
            monthConfig.regular + monthConfig.leave + monthConfig.national;
          const isCurrent = month === currentMonth;

          return (
            <Card
              key={month}
              className={cn(
                "p-4 shadow-sm border flex flex-col",
                isCurrent
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white border-gray-200",
              )}
            >
              <div className="mb-4 pb-2 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Typography
                    variant="h6"
                    className={cn(
                      "font-bold",
                      isCurrent ? "text-blue-700" : "text-slate-800",
                    )}
                  >
                    {month}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyPrev(month)}
                    title="複製上個月設定"
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <Copy size={14} />
                  </IconButton>
                </div>
                <Chip
                  label={`共 ${totalDays} 天`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </div>

              <div className="space-y-3 flex-1">
                {SHIFT_MANAGER_LEAVE_TYPES.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded border border-gray-100"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-700">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.desc}
                      </div>
                    </div>
                    <TextField
                      type="number"
                      size="small"
                      className="w-20 bg-white"
                      value={monthConfig[item.key as keyof typeof monthConfig]}
                      onChange={(e) =>
                        handleChange(month, item.key, e.target.value)
                      }
                      inputProps={{ min: 0, style: { textAlign: "center" } }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 資料管理組件
 * 負責匯入/匯出所有應用程式資料 (JSON)
 * @returns {JSX.Element} DataManager Component
 */
const DataManager = () => {
  const {
    staffList,
    setStaffList,
    groups,
    setGroups,
    schedules,
    setSchedules,
    holidays,
    setHolidays,
    monthlyConfig,
    setMonthlyConfig,
  } = useSchedule();
  const confirm = useConfirm();
  const { showNotification } = useNotification();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 將所有狀態打包成一個物件
  const allData = useMemo(
    () => ({
      staffList,
      groups,
      schedules,
      holidays,
      monthlyConfig,
    }),
    [staffList, groups, schedules, holidays, monthlyConfig],
  );

  // 將資料物件轉換為格式化的 JSON 字串以供顯示
  const jsonText = useMemo(() => JSON.stringify(allData, null, 2), [allData]);

  // 處理匯出
  const handleExport = () => {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm");
    link.download = `schedule-data-${timestamp}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("資料已成功匯出為 JSON 檔案！", "success");
  };

  // 處理匯入
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") {
          throw new Error("無法讀取檔案內容。");
        }
        const importedData = JSON.parse(text);

        // 簡單驗證匯入的資料結構
        if (
          !("staffList" in importedData) ||
          !("groups" in importedData) ||
          !("schedules" in importedData) ||
          !("holidays" in importedData) ||
          !("monthlyConfig" in importedData)
        ) {
          throw new Error("JSON 檔案格式不符。缺少必要的資料鍵。");
        }

        confirm({
          title: "匯入資料",
          description: (
            <>
              您確定要匯入新資料嗎？
              <br />
              <strong style={{ color: "#d32f2f" }}>
                此動作將會覆蓋所有現有資料且無法復原。
              </strong>
            </>
          ),
          confirmText: "確定匯入",
          onConfirm: () => {
            // 使用匯入的資料更新 Context 狀態
            setStaffList(importedData.staffList);
            setGroups(importedData.groups);
            setSchedules(importedData.schedules);
            setHolidays(importedData.holidays);
            setMonthlyConfig(importedData.monthlyConfig);
            showNotification("資料匯入成功！頁面將會同步更新。", "success");
          },
        });
      } catch (error) {
        console.error("Import failed:", error);
        showNotification(
          `匯入失敗: ${error instanceof Error ? error.message : "未知錯誤"}`,
          "error",
        );
      } finally {
        // 清空 file input 以便下次能觸發 onChange
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="p-6 mb-6 bg-slate-50 border-none shadow-sm">
        <Typography variant="h6" className="flex items-center gap-2 mb-2">
          <Database size={20} className="text-blue-600" /> 資料管理
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-4">
          您可以在此匯出所有設定（人員、分組、班表、節日等）為一個 JSON
          檔案作為備份，或從備份檔案匯入以還原資料。
          <br />
          <strong className="text-red-600">
            注意：匯入將會覆蓋所有現有資料且無法復原。
          </strong>
        </Typography>
        <div className="flex gap-4">
          <Button
            variant="contained"
            startIcon={<Download size={18} />}
            onClick={handleExport}
          >
            匯出備份
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload size={18} />}
            onClick={() => fileInputRef.current?.click()}
          >
            從備份匯入
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept="application/json,.json"
            className="hidden"
          />
        </div>
      </Card>

      <div>
        <Typography variant="subtitle1" className="mb-2 font-semibold">
          目前資料預覽 (JSON)
        </Typography>
        <textarea
          readOnly
          className="w-full h-96 p-3 border border-gray-300 rounded-lg font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
          value={jsonText}
          aria-label="Current data in JSON format"
        />
      </div>
    </div>
  );
};

export {
  ScheduleTable,
  GroupManager,
  StaffManager,
  HolidayManager,
  ShiftManager,
  DataManager,
};
