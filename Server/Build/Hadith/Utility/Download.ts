import * as fs from "fs";
import { HADITH_DATA_DIR } from "../Config.ts";

export async function ensureHadithDataExists(): Promise<void> {
  if (!fs.existsSync(HADITH_DATA_DIR)) {
    fs.mkdirSync(HADITH_DATA_DIR, { recursive: true });
  }
}