import * as fs from "fs";
import * as path from "path";

export function shouldRebuildDb(
  targetDbPath: string, 
  sourceDir: string, 
  force: boolean = false
): boolean {
  // If --force was passed, ignore cache and always rebuild
  if (force) return true;

  if (!fs.existsSync(targetDbPath)) return true;

  const dbStats = fs.statSync(targetDbPath);

  function checkDir(dir: string): boolean {
    if (!fs.existsSync(dir)) return false;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (checkDir(fullPath)) return true;
      } else {
        const fileStats = fs.statSync(fullPath);
        if (fileStats.mtimeMs > dbStats.mtimeMs) {
          return true;
        }
      }
    }
    return false;
  }

  return checkDir(sourceDir);
}