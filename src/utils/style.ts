// 職位標籤顏色
export const getTitleColor = (title: string) => {
  if (title === "Chef" || title === "Sous chef")
    return "bg-red-100 text-red-700";
  if (title === "CDP" || title === "Demi CDP")
    return "bg-blue-100 text-blue-700";
  if (title === "Commis") return "bg-green-100 text-green-700";
  if (title === "Inter") return "bg-orange-100 text-orange-800";
  if (title === "PT") return "bg-gray-100 text-gray-600";
  return "bg-slate-100 text-slate-700";
};
