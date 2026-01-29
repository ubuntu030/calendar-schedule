import { useState } from "react";
import { Button, Typography } from "@mui/material";
import { Save, Upload, Trash2 } from "lucide-react";

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
        Object.values(merged).sort((a, b) => a.date.localeCompare(b.date)),
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
                  setHolidays((prev: any) =>
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

export default HolidayManager;
