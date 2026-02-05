import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_GROUPS, DEFAULT_HOLIDAYS, DEFAULT_STAFF } from "./defaultData";
import type { Staff, Group, Schedules, Holiday, MonthlyConfigs } from "./types";

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

// [Refactor] 建立 Provider 組件，封裝所有狀態邏輯
export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  // 初始資料 (從 App.tsx 搬移過來)
  const [staffList, setStaffList] = useState<Staff[]>(DEFAULT_STAFF);
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS);
  const [schedules, setSchedules] = useState<Schedules>({});
  const [holidays, setHolidays] = useState<Holiday[]>(DEFAULT_HOLIDAYS);
  const [monthlyConfig, setMonthlyConfig] = useState<MonthlyConfigs>({});

  // [Refactor] 更新排班邏輯
  // 注意：這裡需要傳入 monthStr (yyyy-MM)，因為 Context 不知道 UI 當前選在哪個月份
  const updateShift = (
    staffId: string,
    day: string,
    value: string,
    monthStr: string,
  ) => {
    setSchedules((prev: Schedules) => {
      const monthData = prev[monthStr] || {};
      const staffData = monthData[staffId] || {};
      return {
        ...prev,
        [monthStr]: {
          ...monthData,
          [staffId]: { ...staffData, [day]: value },
        },
      };
    });
  };

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
