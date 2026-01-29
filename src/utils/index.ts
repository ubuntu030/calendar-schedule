import { TITLE_WEIGHTS } from "../constants/index.js";

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
const cn = (...classes) => classes.filter(Boolean).join(" ");

export { getDaysInMonth, sortStaff, cn };
