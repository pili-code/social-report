import XLSX from "xlsx";
import fs from "node:fs";

const files = process.argv.slice(2);
for (const file of files) {
  const wb = XLSX.read(fs.readFileSync(file));
  console.log("===", file.split("/").pop(), "— sheets:", wb.SheetNames);
  const sheet = wb.Sheets["Metrics"];
  if (!sheet) { console.log("  no Metrics sheet"); continue; }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
  const headerIdx = rows.findIndex((r) => r?.[0] === "Date");
  const headers = rows[headerIdx];
  const data = rows.slice(headerIdx + 1).filter((r) => r?.[0]);
  if (data.length === 0) { console.log("  no data"); continue; }
  console.log("  headers:", headers);
  console.log("  rows:", data.length, "first:", data[0]?.[0], "last:", data.at(-1)?.[0]);
  // Print first and last data row in full
  console.log("  first row:", data[0]);
  console.log("  last row:", data.at(-1));
}
