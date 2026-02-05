import React, { createContext, useContext } from "react";

/**
 * @interface TableHoverContextType
 * @description 定義 TableHoverContext 的資料結構。
 * 這個 Context 用於在表格組件中共享滑鼠懸停在哪一列的狀態。
 */
export interface TableHoverContextType {
  /**
   * @property {number | null} hoveredColIndex - 當前滑鼠懸停的欄位索引。
   * 如果沒有懸停在任何欄位上，則為 null。
   */
  hoveredColIndex: number | null;
  /**
   * @function setHoveredColIndex
   * @description 更新 hoveredColIndex 狀態的函式。
   * @param {number | null} index - 要設定的欄位索引，或 null。
   */
  setHoveredColIndex: (index: number | null) => void;
}

/**
 * @const TableHoverContext
 * @description 建立 React Context 物件。
 * 它將用於在組件樹中傳遞滑鼠懸停的欄位狀態。
 * 這裡提供了預設值，以確保在沒有 Provider 的情況下應用程式不會崩潰，
 * 儘管在實際使用中，useTableHover hook 會拋出錯誤。
 */
export const TableHoverContext = createContext<TableHoverContextType>({
  hoveredColIndex: null,
  // 預設的 setter 函式，不做任何事。實際的函式會由 Provider 提供。
  setHoveredColIndex: () => {},
});

/**
 * @function useTableHover
 * @description 一個自定義 Hook，用於簡化對 TableHoverContext 的取用。
 * @returns {TableHoverContextType} - 回傳 context 的值。
 * @throws {Error} - 如果此 Hook 沒有在 TableHoverProvider 的子組件中使用，將會拋出錯誤。
 * 這是為了確保組件總能獲取到有效的 context 值。
 */
export const useTableHover = () => {
  const context = useContext(TableHoverContext);
  if (context === undefined) {
    // 檢查 context 是否為 undefined，這是 useContext 在找不到 Provider 時的返回值。
    throw new Error("useTableHover must be used within a TableHoverProvider");
  }
  return context;
};