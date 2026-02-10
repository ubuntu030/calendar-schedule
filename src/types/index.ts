/**
 * 員工資料介面
 */
export interface Staff {
  id: string;
  name: string;
  title: string;
  disableAuto?: boolean;
}

/**
 * 群組資料介面
 */
export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  minStaffCount: number;
}

/**
 * 節日類型
 */
export type HolidayType = "NATIONAL" | "WEEKEND" | "MANUAL";

/**
 * 節日資料介面
 */
export interface Holiday {
  date: string;
  name: string;
  isOff: string;
  color: string;
  type: HolidayType;
}

/**
 * 單一排班資料
 */
export interface Shift {
  value: string;
  isManual: boolean;
}

/**
 * 排班資料結構 e.g. { "2023-10": { "staff-1": { "01": { value: "早", isManual:
 * true } } } }
 */
export interface Schedules {
  [yearMonth: string]: {
    [staffId: string]: {
      [day: string]: Shift;
    };
  };
}

/**
 * 每月假別設定
 */
export interface MonthConfig {
  regular: number;
  leave: number;
  national: number;
}

/**
 * 所有月份的假別設定
 * e.g. { "2023-10": { regular: 8, leave: 2, national: 1 } }
 */
export interface MonthlyConfigs {
  [yearMonth: string]: MonthConfig;
}
