export function toCsv(headers: string[], rows: string[][]): string {
  return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const blob = new Blob(["﻿" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
