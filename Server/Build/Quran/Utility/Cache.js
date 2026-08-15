import * as fs from "fs";
import * as path from "path";
import { FORCE_REBUILD } from "../Config.js";

export function shouldRebuildDb(targetDbPath, sourceFilesDir) {
  if (FORCE_REBUILD || !fs.existsSync(targetDbPath)) return true;

  const dbMtime = fs.statSync(targetDbPath).mtimeMs;

  function isModified(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (isModified(fullPath)) return true;
      } else if (entry.isFile()) {
        if (fs.statSync(fullPath).mtimeMs > dbMtime) {
          return true;
        }
      }
    }
    return false;
  }

  return isModified(sourceFilesDir);
}