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

export { TITLE_WEIGHTS, SHIFT_OPTIONS };
