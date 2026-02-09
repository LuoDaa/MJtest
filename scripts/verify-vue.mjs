import fs from "node:fs";
import { parse } from "@vue/compiler-sfc";

const files = [
  "src/App.vue",
  "src/components/FortuneHeader.vue",
  "src/components/FortuneForm.vue",
  "src/components/FortuneResult.vue",
];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const { errors } = parse(source, { filename: file });
  if (errors.length) {
    throw new Error(`${file} parse error: ${JSON.stringify(errors, null, 2)}`);
  }
}

console.log("vue check passed");
