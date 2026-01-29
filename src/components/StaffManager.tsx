import { sortStaff } from "../utils";

import { useState } from "react";
import {
  TextField,
  Button,
  Card,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { TITLE_WEIGHTS } from "../constants";

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

export default StaffManager;
