import type { Group } from "./types";

export const DEFAULT_STAFF = [
  { id: "200043", name: "廖仁彥", title: "Chef" },
  { id: "190098", name: "羅雅今", title: "CDP" },
  { id: "210028", name: "蔡幸秀", title: "Commis" },
  { id: "240014", name: "柳家豪", title: "CDP" },
  { id: "220006", name: "黃瀞祈", title: "Demi CDP" },
  { id: "220032", name: "陳麗幸", title: "Commis" },
  { id: "230023", name: "鄭博容", title: "Commis" },
  { id: "N250022", name: "張心嵐", title: "Inter" },
  { id: "PT001", name: "鄭淨文", title: "PT" },
  { id: "170142", name: "郭宜樺", title: "Sous chef" },
  { id: "220070", name: "趙子晴", title: "CDP" },
  { id: "210026", name: "湯美君", title: "Commis" },
  { id: "N260005", name: "李晉丞", title: "Inter" },
];

export const DEFAULT_GROUPS: Group[] = [
  {
    id: "g1",
    name: "早班 (甜點)",
    memberIds: ["200043", "190098", "210028"],
    minStaffCount: 2,
  },
  {
    id: "g2",
    name: "晚班 (甜點)",
    memberIds: ["240014", "220006", "220032", "230023", "N250022", "PT001"],
    minStaffCount: 3,
  },
  {
    id: "g3",
    name: "麵包部",
    memberIds: ["170142", "220070", "210026", "N260005"],
    minStaffCount: 2,
  },
];

export const DEFAULT_HOLIDAYS = [
  {
    date: "2026-01-01",
    name: "開國紀念日",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-15",
    name: "小年夜",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-16",
    name: "農曆除夕",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-17",
    name: "春節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-18",
    name: "春節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-19",
    name: "春節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-20",
    name: "補假",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-27",
    name: "補假",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-02-28",
    name: "和平紀念日",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-04-03",
    name: "補假",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-04-04",
    name: "兒童節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-04-05",
    name: "清明節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-04-06",
    name: "補假",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-05-01",
    name: "勞動節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-06-19",
    name: "端午節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-09-25",
    name: "中秋節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-09-28",
    name: "孔子誕辰紀念日/教師節",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-10-09",
    name: "補假",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-10-10",
    name: "國慶日",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-10-25",
    name: "臺灣光復暨金門古寧頭大捷紀念日",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-10-26",
    name: "補假",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
  {
    date: "2026-12-25",
    name: "行憲紀念日",
    isOff: "2",
    color: "bg-red-500 text-white",
    type: "NATIONAL",
  },
] as {
  date: string;
  name: string;
  isOff: string;
  color: string;
  type: "NATIONAL" | "WEEKEND" | "MANUAL";
}[];
