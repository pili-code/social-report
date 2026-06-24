import XLSX from "xlsx";
import fs from "node:fs";

const file = process.argv[2];
const wb = XLSX.read(fs.readFileSync(file));
console.log("Sheets:", wb.SheetNames);
for (const name of wb.SheetNames) {
  console.log(`\n=== ${name} ===`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: null });
  for (const r of rows.slice(0, 40)) console.log(" ", r);
}
