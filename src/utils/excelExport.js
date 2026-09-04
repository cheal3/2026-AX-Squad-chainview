import * as XLSX from "xlsx";

export function downloadXlsx(fileName, columns, rows, sheetName = "Sheet1") {
  const normalizedColumns = columns.map((column) =>
    Array.isArray(column) ? column : [String(column), String(column)]
  );
  const data = rows.map((row) =>
    Object.fromEntries(
      normalizedColumns.map(([label, key]) => [
        label,
        typeof key === "function" ? key(row) : row?.[key],
      ])
    )
  );
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: normalizedColumns.map(([label]) => label),
  });
  worksheet["!cols"] = normalizedColumns.map(([label]) => ({
    wch: Math.min(Math.max(String(label).length + 8, 14), 36),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
