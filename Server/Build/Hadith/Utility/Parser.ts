import * as fs from "fs";

export function cleanString(str: unknown): string {
  if (typeof str !== "string") return "";
  return str.trim().replace(/^["']|["']$/g, "");
}

export function readJsonFile(filePath: string): unknown {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}