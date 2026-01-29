import React, { useState, useMemo, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Card,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import {
  Calendar,
  Users,
  Settings,
  AlertTriangle,
  Save,
  Upload,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Layers,
  UserPlus,
  UserMinus,
  X,
} from "lucide-react";

/**
 * ============================================================================
 * 1. TYPE DEFINITIONS & CONSTANTS (型別定義與常數)
 * ============================================================================
 */

/**
 * 員工資料介面
 * @typedef {Object} Staff
 * @property {string} id - 員工唯一編號
 * @property {string} name - 員工姓名
 * @property {string} title - 職稱 (Chef, CDP, etc.)
 */

/**
 * 群組資料介面
 * @typedef {Object} Group
 * @property {string} id - 群組唯一編號
 * @property {string} name - 群組名稱 (如: 內場, 外場)
 * @property {string[]} memberIds - 該群組成員的 ID 列表
 */

/**
 * 節日資料介面
 * @typedef {Object} Holiday
 * @property {string} date - 日期 (YYYY-MM-DD)
 * @property {string} name - 節日名稱
 * @property {string} isOff - '0'|'2' 是否放假
 * @property {string} color - Tailwind class for styling
 * @property {'NATIONAL' | 'WEEKEND' | 'MANUAL'} type - 節日類型
 */

// 職位權重設定 (數值越小排序越前)
const TITLE_WEIGHTS = {
  Chef: 1,
  "Sous chef": 2,
  CDP: 3,
  "Demi CDP": 4,
  Commis: 5,
  Inter: 6,
  PT: 7,
};

// 班別選項設定
const SHIFT_OPTIONS = [
  { value: "", label: "-", color: "bg-transparent" },
  { value: "早", label: "早", color: "bg-blue-100 text-blue-800 font-bold" },
  {
    value: "晚",
    label: "晚",
    color: "bg-indigo-100 text-indigo-800 font-bold",
  },
  {
    value: "全",
    label: "全",
    color: "bg-purple-100 text-purple-800 font-bold",
  },
  { value: "例", label: "例", color: "bg-gray-200 text-gray-500" },
  {
    value: "休",
    label: "休",
    color: "bg-white border border-gray-300 text-gray-400",
  },
];

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
const sortStaff = (staffList: any[]) => {
  return [...staffList].sort((a, b) => {
    const weightA = TITLE_WEIGHTS[a.title as keyof typeof TITLE_WEIGHTS] || 99;
    const weightB = TITLE_WEIGHTS[b.title as keyof typeof TITLE_WEIGHTS] || 99;
    if (weightA !== weightB) return weightA - weightB;
    return a.id.localeCompare(b.id);
  });
};

// 工具：Tailwind Class 合併 (簡易版 clsx)
const cn = (...classes: string[]) => classes.filter(Boolean).join(" ");

/**
 * ============================================================================
 * 2. SUB-COMPONENTS (子組件層)
 * ============================================================================
 */

/**
 * 排班主表組件
 * 負責顯示排班表格、處理分組顯示與規則檢查
 * * @param {Object} props
 * @param {string} props.currentMonth - 當前月份 (YYYY-MM)
 * @param {Staff[]} props.staffList - 員工列表
 * @param {Group[]} props.groups - 分組列表
 * @param {Object} props.schedules - 排班數據
 * @param {Function} props.onUpdateShift - 更新排班函式
 * @param {Holiday[]} props.holidays - 節日列表
 */
const ScheduleTable = ({
  currentMonth,
  staffList,
  groups,
  schedules,
  onUpdateShift,
  holidays,
}: {
  currentMonth: string;
  staffList: any[];
  groups: any[];
  schedules: any;
  onUpdateShift: any;
  holidays: any[];
}) => {
  // 計算當月日期
  const days = useMemo(() => {
    const [year, month] = currentMonth.split("-").map(Number);
    return getDaysInMonth(year, month);
  }, [currentMonth]);

  /**
   * 日期格式化 (Local Time)
   * @param {Date} date
   * @returns {string} YYYY-MM-DD
   */
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 取得節日資訊
  const getHoliday = (dateObj: Date) => {
    const dateStr = formatDate(dateObj);
    return holidays.find((h) => h.date === dateStr);
  };

  /**
   * 規則檢查引擎
   * @param {string} dateStr - YYYY-MM-DD
   */
  const checkRules = (dateStr: string) => {
    const holiday = holidays.find((h) => h.date === dateStr);
    if (!holiday || holiday.isOff !== "2") return { pass: true };

    // 取得當日所有有排班的員工 (不分組)
    const workers = staffList.filter((staff) => {
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

  // --- 分組渲染邏輯 ---
  // 1. 找出所有已分組的 ID
  const groupedStaffIds = new Set(groups.flatMap((g) => g.memberIds));

  // 2. 找出未分組的員工
  const ungroupedStaff = staffList.filter((s) => !groupedStaffIds.has(s.id));

  /**
   * 渲染單一員工列
   * @param {Staff} staff
   */
  const renderStaffRow = (staff: any) => (
    <tr key={staff.id} className="hover:bg-blue-50 group transition-colors">
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
        const dateStr = formatDate(d);
        const shiftValue = schedules[currentMonth]?.[staff.id]?.[dayStr] || "";
        const holiday = getHoliday(d);
        const shiftConfig = SHIFT_OPTIONS.find((s) => s.value === shiftValue);
        const cellBg = shiftConfig?.value
          ? shiftConfig.color
          : holiday?.color?.split(" ")[0] || "";

        return (
          <td
            key={d.toISOString()}
            className={cn("border-r border-b p-0 relative h-12", cellBg)}
          >
            <select
              value={shiftValue}
              onChange={(e) => onUpdateShift(staff.id, dayStr, e.target.value)}
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
  );

  return (
    <div className="flex-1 overflow-auto border rounded-lg shadow-inner bg-white relative">
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-30 bg-white shadow-sm">
          {/* 節日資訊列 */}
          <tr>
            <th className="sticky left-0 top-0 z-40 bg-slate-50 border-b border-r min-w-[140px] p-2 text-left text-xs font-normal text-gray-500">
              <div className="flex items-center gap-1">
                <AlertTriangle size={12} /> 規則提示
              </div>
            </th>
            {days.map((d) => {
              const dateStr = formatDate(d);
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
          {/* 日期列 */}
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
        <tbody>
          {/* 1. 渲染分組員工 */}
          {groups.map((group, index) => {
            // 取得該群組的員工並排序
            const groupStaff = staffList.filter((s) =>
              group.memberIds.includes(s.id),
            );
            const sortedGroupStaff = sortStaff(groupStaff);

            if (sortedGroupStaff.length === 0) return null;

            return (
              <React.Fragment key={group.id}>
                {/* 群組分隔列 (Spacer) */}
                <tr>
                  <td
                    colSpan={days.length + 1}
                    className="h-6 bg-slate-100 border-b border-t text-xs text-slate-400 pl-4 font-bold tracking-wider"
                  >
                    --- {group.name} ---
                  </td>
                </tr>
                {sortedGroupStaff.map(renderStaffRow)}
              </React.Fragment>
            );
          })}

          {/* 2. 渲染未分組員工 (Spacer) */}
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
              {sortStaff(ungroupedStaff).map(renderStaffRow)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 分組管理組件
 * 提供群組的新增、更名、成員管理功能
 * * @param {Object} props
 * @param {Group[]} props.groups
 * @param {Function} props.setGroups
 * @param {Staff[]} props.staffList
 */
const GroupManager = ({
  groups,
  setGroups,
  staffList,
}: {
  groups: any[];
  setGroups: any;
  staffList: any[];
}) => {
  const [newGroupName, setNewGroupName] = useState("");

  // 新增群組
  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: `g_${Date.now()}`,
      name: newGroupName,
      memberIds: [],
    };
    setGroups([...groups, newGroup]);
    setNewGroupName("");
  };

  // 刪除群組
  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm("確定刪除此群組？成員將變為未分組狀態。")) {
      setGroups(groups.filter((g) => g.id !== groupId));
    }
  };

  // 更新群組名稱
  const handleUpdateGroupName = (groupId: string, newName: string) => {
    setGroups(
      groups.map((g) => (g.id === groupId ? { ...g, name: newName } : g)),
    );
  };

  // 加入成員到群組 (需處理 Exclusive Logic: 從其他群組移除)
  const handleAddMember = (groupId: string, staffId: string) => {
    setGroups((prevGroups: any) => {
      // 1. 先從所有群組中移除該 staffId
      const clearedGroups = prevGroups.map((g: any) => ({
        ...g,
        memberIds: g.memberIds.filter((id: string) => id !== staffId),
      }));

      // 2. 加入到目標群組
      return clearedGroups.map((g: any) =>
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border">
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
            className="p-4 bg-slate-50 border shadow-sm flex flex-col h-[400px]"
          >
            {/* Header: 組名編輯與刪除 */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
              <input
                className="font-bold text-lg bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-slate-800 w-full mr-2"
                value={group.name}
                onChange={(e) =>
                  handleUpdateGroupName(group.id, e.target.value)
                }
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteGroup(group.id)}
              >
                <Trash2 size={16} />
              </IconButton>
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
                            staff.title.includes("Chef")
                              ? "bg-red-400"
                              : "bg-blue-400",
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
            <div className="pt-2 border-t border-slate-200">
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

// --- 組件：人員管理 ---
const StaffManager = ({
  staffList,
  setStaffList,
}: {
  staffList: any[];
  setStaffList: any;
}) => {
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
    if (window.confirm("確定刪除此員工？")) {
      setStaffList(staffList.filter((s) => s.id !== id));
    }
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
          <FormControl size="small" className="min-w-[120px] bg-white">
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

      <div className="bg-white rounded-lg border overflow-hidden">
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
                  <Chip
                    label={s.title}
                    size="small"
                    className={
                      s.title === "Chef" ? "bg-red-100 text-red-700" : ""
                    }
                  />
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

// --- 組件：節日管理 ---
const HolidayManager = ({
  holidays,
  setHolidays,
}: {
  holidays: any[];
  setHolidays: any;
}) => {
  const [jsonInput, setJsonInput] = useState("");

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const newHolidays = parsed.map((item: any) => {
        // 轉換 20260101 -> 2026-01-01
        const d = item.西元日期;
        const dateStr = `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`;

        let colorClass = "";
        let type = "NORMAL";
        if (item.是否放假 === "2") {
          if (item.備註) {
            colorClass = "bg-red-500 text-white"; // 國定假日
            type = "NATIONAL";
          } else {
            colorClass = "bg-red-50 text-red-500"; // 週末
            type = "WEEKEND";
          }
        }
        return {
          date: dateStr,
          name: item.備註,
          isOff: item.是否放假,
          color: colorClass,
          type,
        };
      });

      // 合併去重
      const merged = [...holidays, ...newHolidays].reduce((acc, curr) => {
        acc[curr.date] = curr;
        return acc;
      }, {});

      setHolidays(
        Object.values(merged).sort((a: any, b: any) =>
          a.date.localeCompare(b.date),
        ),
      );
      alert(`成功匯入 ${newHolidays.length} 筆資料`);
      setJsonInput("");
    } catch (e) {
      alert("JSON 格式錯誤，請確認");
    }
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Typography variant="h6" className="flex items-center gap-2">
          <Upload size={20} /> JSON 自動匯入
        </Typography>
        <Typography variant="body2" className="text-gray-500">
          支援格式:{" "}
          {`{ "西元日期": "20260101", "是否放假": "2", "備註": "..." }`}
        </Typography>
        <textarea
          className="w-full h-48 p-3 border rounded-lg font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="在此貼上 JSON..."
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<Save size={16} />}
          onClick={handleImport}
          fullWidth
        >
          解析並儲存
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden flex flex-col h-[400px]">
        <div className="bg-slate-100 p-3 font-semibold border-b">
          已登錄節日 ({holidays.length})
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {holidays.length === 0 && (
            <div className="text-center text-gray-400 mt-10">尚無節日資料</div>
          )}
          {holidays.map((h) => (
            <div
              key={h.date}
              className="flex justify-between items-center p-2 border rounded hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500 text-sm">
                  {h.date}
                </span>
                {h.name && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${h.type === "NATIONAL" ? "bg-red-100 text-red-700 font-bold" : "bg-gray-200"}`}
                  >
                    {h.name}
                  </span>
                )}
                {h.type === "WEEKEND" && (
                  <span className="text-xs text-gray-400">週末</span>
                )}
              </div>
              <Button
                size="small"
                color="error"
                onClick={() =>
                  setHolidays((prev: any[]) =>
                    prev.filter((x) => x.date !== h.date),
                  )
                }
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { ScheduleTable, GroupManager, StaffManager, HolidayManager };
