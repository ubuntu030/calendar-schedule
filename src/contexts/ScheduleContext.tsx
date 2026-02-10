import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
  useCallback,
} from "react";
import {
  DEFAULT_GROUPS,
  DEFAULT_HOLIDAYS,
  DEFAULT_STAFF,
} from "../defaultData";
import type {
  Staff,
  Group,
  Schedules,
  Holiday,
  MonthlyConfigs,
} from "../types";

// [Refactor] 定義 Context 的資料型別，包含狀態與操作函式
interface ScheduleContextType {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  schedules: Schedules;
  setSchedules: React.Dispatch<React.SetStateAction<Schedules>>;
  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  monthlyConfig: MonthlyConfigs;
  setMonthlyConfig: React.Dispatch<React.SetStateAction<MonthlyConfigs>>;
  // [Refactor] 將 updateShift 移至 Context，並增加 monthStr 參數以解耦對 currentDate 的依賴
  updateShift: (
    staffId: string,
    day: string,
    value: string,
    monthStr: string,
  ) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(
  undefined,
);

// [Refactor] 獨立為 useLocalStorage Hook，處理資料持久化
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}

// [Refactor] 建立 Provider 組件，封裝所有狀態邏輯
export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  // 初始資料改為從 localStorage 讀取，若無則使用預設值
  const [staffList, setStaffList] = useLocalStorage<Staff[]>(
    "staffList",
    DEFAULT_STAFF,
  );
  const [groups, setGroups] = useLocalStorage<Group[]>(
    "groups",
    DEFAULT_GROUPS,
  );
  const [schedules, setSchedules] = useLocalStorage<Schedules>("schedules", {});
  const [holidays, setHolidays] = useLocalStorage<Holiday[]>(
    "holidays",
    DEFAULT_HOLIDAYS,
  );
  const [monthlyConfig, setMonthlyConfig] = useLocalStorage<MonthlyConfigs>(
    "monthlyConfig",
    {},
  );

  // [Refactor] 更新排班邏輯
  // 注意：這裡需要傳入 monthStr (yyyy-MM)，因為 Context 不知道 UI 當前選在哪個月份
  // [Perf] 使用 useCallback 包裝以確保函數引用穩定，優化子組件的 memoization
  const updateShift = useCallback(
    (staffId: string, day: string, value: string, monthStr: string) => {
      setSchedules((prev: Schedules) => {
        const monthData = prev[monthStr] || {};
        const staffData = monthData[staffId] || {};
        return {
          ...prev,
          [monthStr]: {
            ...monthData,
            [staffId]: { ...staffData, [day]: value as any },
          },
        };
      });
    },
    [setSchedules],
  );

  const value = {
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
    updateShift,
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
};

// [Refactor] 自定義 Hook，方便組件取用資料
// eslint-disable-next-line react-refresh/only-export-components
export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};
