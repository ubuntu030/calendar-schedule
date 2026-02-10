import type { Staff, Group, Schedules, Shift, MonthConfig } from "../types";

/**
 * ============================================================================
 * 自動排休演算法 (AUTO-SCHEDULING ALGORITHM)
 *
 * 這些函式被重構以提高可讀性和可維護性。
 * 主要入口點是 `generateAutoLeaves`。
 * ============================================================================
 */

/**
 * 工具函式：取得指定月份的所有日期物件
 * @param year - 年份
 * @param month - 月份 (1-12)
 * @returns 該月份的 Date 物件陣列
 */
const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month - 1, 1);
  const days = [];
  while (date.getMonth() === month - 1) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

/**
 * 工具函式：Fisher-Yates (aka Knuth) 隨機排序演算法
 * @param array - 要排序的陣列
 * @returns 一個新的、已隨機排序的陣列
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// 為單一員工的排休過程建立的上下文物件介面
interface SchedulingContext {
  staffId: string;
  staffSchedule: { [day: string]: Shift };
  assignLeave: (dayStr: string, leaveType: "例" | "休" | "國") => boolean;
}

/**
 * 為單一員工的排休過程建立一個上下文(Context)。
 * 這個上下文包含了他們目前的班表、剩餘的休假額度，
 * 以及一個預先配置好的 `assignLeave` 函式，該函式會處理所有檢查。
 */
const createSchedulingContext = (
  staffId: string,
  staffSchedule: { [day: string]: Shift },
  schedules: Schedules,
  month: string,
  staffList: Staff[],
  groups: Group[],
  mConfig: MonthConfig,
): SchedulingContext => {
  // 計算此員工的剩餘休假額度
  const manualLeaves = Object.values(staffSchedule).filter(
    (s) => s.isManual && ["例", "休", "國"].includes(s.value),
  );
  const leaveQuotas = {
    例: mConfig.regular - manualLeaves.filter((s) => s.value === "例").length,
    休: mConfig.leave - manualLeaves.filter((s) => s.value === "休").length,
    國: mConfig.national - manualLeaves.filter((s) => s.value === "國").length,
  };

  // 輔助函式：檢查員工所屬分組的最低人力需求
  const checkManpower = (dayStr: string): boolean => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return true; // 找不到員工，不阻擋

    const group = groups.find((g) => g.memberIds.includes(staffId));
    if (!group || !group.minStaffCount) return true; // 沒分組或沒設定最低人力，不阻擋

    let potentialWorkers = 0;
    group.memberIds.forEach((memberId) => {
      if (memberId === staffId) return; // 不計算正在排休的這位員工
      const shiftValue = schedules[month]?.[memberId]?.[dayStr]?.value;
      const isLeave = shiftValue && ["例", "休", "國"].includes(shiftValue);
      if (!isLeave) {
        potentialWorkers++;
      }
    });
    return potentialWorkers >= group.minStaffCount;
  };

  // 核心的排休函式
  const assignLeave = (
    dayStr: string,
    leaveType: "例" | "休" | "國",
  ): boolean => {
    if (
      leaveQuotas[leaveType] > 0 && // 還有假
      !staffSchedule[dayStr] && // 當天是空班
      checkManpower(dayStr) // 分組人力足夠
    ) {
      staffSchedule[dayStr] = { value: leaveType, isManual: false };
      leaveQuotas[leaveType]--;
      return true;
    }
    return false;
  };

  return { staffId, staffSchedule, assignLeave };
};

/**
 * 規則 1：強制在連續工作 6 天後安排一個休息日。
 */
const applyMandatoryBreakRule = (
  daysInMonth: Date[],
  { staffSchedule, assignLeave }: SchedulingContext,
) => {
  let consecutiveWorkDays = 0;
  for (const day of daysInMonth) {
    const dayStr = String(day.getDate()).padStart(2, "0");
    const shift = staffSchedule[dayStr];
    const isWorkDay = !shift || !["例", "休", "國"].includes(shift.value);

    if (isWorkDay) {
      consecutiveWorkDays++;
    } else {
      consecutiveWorkDays = 0;
    }

    if (consecutiveWorkDays >= 6) {
      const breakDayIndex = daysInMonth.indexOf(day) + 1;
      if (breakDayIndex < daysInMonth.length) {
        const breakDayStr = String(
          daysInMonth[breakDayIndex].getDate(),
        ).padStart(2, "0");
        // 只在當天完全沒有排班時才強制排休
        if (!staffSchedule[breakDayStr]) {
          // 嘗試排入任何一種假
          if (
            assignLeave(breakDayStr, "例") ||
            assignLeave(breakDayStr, "休") ||
            assignLeave(breakDayStr, "國")
          ) {
            consecutiveWorkDays = 0; // 成功排休後重置計數器
          }
        }
      }
    }
  }
};

/**
 * 規則 2 & 3：隨機分配剩餘的假期，並避免連續自動排休超過 2 天。
 */
const assignRemainingLeavesRandomly = (
  daysInMonth: Date[],
  { staffSchedule, assignLeave }: SchedulingContext,
) => {
  // 找出所有還可以排休的空班日期
  const availableDays = daysInMonth
    .map((d) => String(d.getDate()).padStart(2, "0"))
    .filter((dayStr) => !staffSchedule[dayStr]);

  const shuffledDays = shuffleArray(availableDays);

  for (const dayStr of shuffledDays) {
    const dayNum = parseInt(dayStr, 10);
    const prevDayStr = String(dayNum - 1).padStart(2, "0");
    const prev2DayStr = String(dayNum - 2).padStart(2, "0");
    const isPrevAutoLeave =
      staffSchedule[prevDayStr] && !staffSchedule[prevDayStr].isManual;
    const isPrev2AutoLeave =
      staffSchedule[prev2DayStr] && !staffSchedule[prev2DayStr].isManual;

    // 規則 3: 避免連續自動排休超過 2 天
    if (isPrevAutoLeave && isPrev2AutoLeave) continue;

    // 依序嘗試排入假期：例 -> 休 -> 國
    if (assignLeave(dayStr, "例")) {
      // continue
    } else if (assignLeave(dayStr, "休")) {
      // continue
    } else {
      assignLeave(dayStr, "國");
    }
  }
};

/**
 * 自動排休演算法的主要協調函式。
 * 它接收目前的狀態並回傳一個新的、更新後的班表狀態。
 * @param currentSchedules - 目前的班表資料
 * @param staffList - 員工列表
 * @param groups - 分組列表
 * @param mConfig - 當月休假設定
 * @param targetStaffIds - 要進行排休的員工 ID 列表
 * @param month - 目標月份 (格式: YYYY-MM)
 * @returns 新的班表資料
 */
export const generateAutoLeaves = (
  currentSchedules: Schedules,
  staffList: Staff[],
  groups: Group[],
  mConfig: MonthConfig,
  targetStaffIds: string[],
  month: string,
): Schedules => {
  // 使用深拷貝以安全地修改班表
  const newSchedules: Schedules = JSON.parse(JSON.stringify(currentSchedules));
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, monthNum);

  // 步驟 1: 為了冪等性，清除目標人員先前的自動排休
  targetStaffIds.forEach((staffId) => {
    if (newSchedules[month]?.[staffId]) {
      Object.keys(newSchedules[month][staffId]).forEach((day) => {
        if (!newSchedules[month][staffId][day].isManual) {
          delete newSchedules[month][staffId][day];
        }
      });
    }
  });

  // 步驟 2: 處理每一位目標員工
  targetStaffIds.forEach((staffId) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff || staff.disableAuto) return; // 跳過禁用自動排休的員工

    // 初始化班表結構
    if (!newSchedules[month]) newSchedules[month] = {};
    if (!newSchedules[month][staffId]) newSchedules[month][staffId] = {};

    const staffSchedule = newSchedules[month][staffId];

    // 為此員工的排休過程建立一個上下文
    const schedulingContext = createSchedulingContext(
      staffId,
      staffSchedule,
      newSchedules,
      month,
      staffList,
      groups,
      mConfig,
    );

    // 依序套用排休規則
    applyMandatoryBreakRule(daysInMonth, schedulingContext);
    assignRemainingLeavesRandomly(daysInMonth, schedulingContext);
  });

  return newSchedules;
};