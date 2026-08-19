import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  QURAN_DIR,
  DATA_DIR,
  SERVER_ROOT,
  ARCHIVE_NAME,
  RELEASE_URL,
} from "../Config.js";

export async function ensureDataExists(): Promise<void> {
  if (fs.existsSync(QURAN_DIR) && fs.readdirSync(QURAN_DIR).length > 0) {
    console.log(`Local Quran data found at: ${QURAN_DIR}. Skipping download.`);
    return;
  }

  console.log(`Data missing at ${QURAN_DIR}. Downloading ${ARCHIVE_NAME}...`);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const archivePath: string = path.join(SERVER_ROOT, ARCHIVE_NAME);

  const response: Response = await fetch(RELEASE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download archive: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer: ArrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(archivePath, Buffer.from(arrayBuffer));
  console.log(`Archive downloaded successfully. Extracting...`);

  if (ARCHIVE_NAME.endsWith(".tar.gz") || ARCHIVE_NAME.endsWith(".tgz")) {
    execSync(`tar -xzf "${archivePath}" -C "${SERVER_ROOT}"`);
  } else if (ARCHIVE_NAME.endsWith(".zip")) {
    execSync(`unzip -q "${archivePath}" -d "${SERVER_ROOT}"`);
  }

  if (fs.existsSync(archivePath)) {
    fs.unlinkSync(archivePath);
  }

  console.log("Extraction complete.");
}