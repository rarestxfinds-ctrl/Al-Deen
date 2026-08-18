import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import { pipeline } from "stream";
import { fileURLToPath } from "url";

import { renderSurahRouter } from "./API/renderSurah.js";
import { getHadithCorpus } from "./API/Hadith.js";
import { getAidCorpus } from "./API/Aid.js";
import { getRAGCorpus } from "./API/RAG.js";
import {
  Fetch_Quran_Suwar,
  Fetch_Surah,
  Fetch_Surah_Translation,
  Fetch_Surah_Transliteration,
  Fetch_Page_Ranges,
  Fetch_Pages,
  Get_Available_Translations,
  Get_Available_WBW_Translations,
  Get_Available_Transliterations,
  Get_Available_WBW_Transliterations,
} from "./API/Quran.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust base directory relative to dist/build output directory
const CORPUS_BASE_PATH = path.resolve(__dirname, "..", "Asset", "Corpus");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 1. Dynamic On-The-Fly Gzip Compressed Download Route
app.get("/API/Download/*path", (req: Request, res: Response) => {
  try {
    const rawPath = (req.params as Record<string, any>).path ?? req.params[0] ?? "";
    const rawPathString = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath);

    if (!rawPathString || rawPathString.includes("..")) {
      return res.status(403).json({ error: "Access denied." });
    }

    const targetFilePath = path.join(CORPUS_BASE_PATH, path.normalize(rawPathString));

    // Ensure target path stays strictly inside the root directory
    if (!targetFilePath.startsWith(CORPUS_BASE_PATH)) {
      return res.status(403).json({ error: "Access denied." });
    }

    if (!fs.existsSync(targetFilePath) || !fs.statSync(targetFilePath).isFile()) {
      return res.status(404).json({ error: "Database file not found." });
    }

    const fileName = path.basename(targetFilePath);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.gz"`);
    res.setHeader("Content-Encoding", "gzip");

    const fileStream = fs.createReadStream(targetFilePath);
    const gzipStream = zlib.createGzip({ level: 6 });

    pipeline(fileStream, gzipStream, res, (err) => {
      if (err) {
        console.error("[DOWNLOAD STREAM ERROR]", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Download failed." });
        }
      }
    });
  } catch (err) {
    console.error("[DOWNLOAD ROUTE ERROR]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error." });
    }
  }
});

// 2. Quran API Route
app.get("/API/Quran", (req: Request, res: Response) => {
  try {
    const Query_Surah = req.query["Surah"];
    const Query_Font_Type = req.query["Font-Type"] || "Standard";
    const Query_Segments = req.query["Segments"];
    const Query_Page_Raw = req.query["Page"];
    const Query_WBW = req.query["WBW"] === "true";

    const Query_Translation = req.query["Translation"];
    const Query_Transliteration = req.query["Transliteration"];

    const Query_Available_Translations = req.query["Available-Translations"];
    const Query_Available_WBW_Translations = req.query["Available-WBW-Translations"];
    const Query_Available_Transliterations = req.query["Available-Transliterations"];
    const Query_Available_WBW_Transliterations = req.query["Available-WBW-Transliterations"];

    // A. List Available Standard Translations
    if (Query_Available_Translations === "true") {
      const Available_Translations = Get_Available_Translations(CORPUS_BASE_PATH);
      return res.json({ "Available-Translations": Available_Translations });
    }

    // B. List Available Word-By-Word (WBW) Translations
    if (Query_Available_WBW_Translations === "true") {
      const Available_WBW_Translations = Get_Available_WBW_Translations(CORPUS_BASE_PATH);
      return res.json({ "Available-WBW-Translations": Available_WBW_Translations });
    }

    // C1. List Available Standard Transliterations
    if (Query_Available_Transliterations === "true") {
      const Available_Transliterations = Get_Available_Transliterations(CORPUS_BASE_PATH);
      return res.json({ "Available-Transliterations": Available_Transliterations });
    }

    // C2. List Available Word-By-Word (WBW) Transliterations
    if (Query_Available_WBW_Transliterations === "true") {
      const Available_WBW_Transliterations = Get_Available_WBW_Transliterations(CORPUS_BASE_PATH);
      return res.json({ "Available-WBW-Transliterations": Available_WBW_Transliterations });
    }

    // D. Page range/segment layout metadata
    if (Query_Segments === "true") {
      const Page_Segments = Fetch_Page_Ranges();
      return res.json({ "Page-Sections": Page_Segments });
    }

    // E. Raw page table rows (Updated Key to "Pages")
    if (Query_Page_Raw === "true") {
      const Raw_Pages = Fetch_Pages();
      return res.json({ "Pages": Raw_Pages });
    }

    // F. Surah Queries
    if (Query_Surah) {
      const Surah_Number = Number(Query_Surah);

      if (isNaN(Surah_Number) || Surah_Number < 1 || Surah_Number > 114) {
        return res.status(400).json({ error: "Invalid Surah number. Must be between 1 and 114." });
      }

      const Target_Translations = Query_Translation
        ? Array.isArray(Query_Translation)
          ? (Query_Translation as string[])
          : [String(Query_Translation)]
        : [];

      const Target_Transliterations = Query_Transliteration
        ? Array.isArray(Query_Transliteration)
          ? (Query_Transliteration as string[])
          : [String(Query_Transliteration)]
        : [];

      if (Target_Translations.length > 0 || Target_Transliterations.length > 0) {
        const Response_Data: Record<string, any> = {};

        if (Target_Translations.length > 0) {
          const Translation_Data = Fetch_Surah_Translation(
            Surah_Number,
            Target_Translations,
            Query_WBW
          );
          Object.assign(Response_Data, Translation_Data);
        }

        if (Target_Transliterations.length > 0) {
          const Transliteration_Data = Fetch_Surah_Transliteration(
            Surah_Number,
            Target_Transliterations,
            Query_WBW
          );
          Object.assign(Response_Data, Transliteration_Data);
        }

        return res.json(Response_Data);
      }

      // Fallback: Core Structural Data ONLY (Fetch_Surah)
      const Font_Type = String(Query_Font_Type);
      const Static_Surah = Fetch_Surah(Surah_Number, Font_Type);

      if (!Static_Surah) {
        return res.status(404).json({ error: "Surah not found." });
      }

      return res.json(Static_Surah);
    }

    // G. Default: All Surahs
    const All_Surahs = Fetch_Quran_Suwar();
    return res.json(All_Surahs);
  } catch (Err) {
    console.error("[SERVER ROUTE ERROR]", Err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Additional API Endpoints
app.get("/api/hadith-corpus", async (_req: Request, res: Response) => {
  try {
    const data = await getHadithCorpus();
    res.json(data);
  } catch (err) {
    console.error("[HADITH CORPUS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch Hadith corpus." });
  }
});

app.get("/api/aid-corpus", async (_req: Request, res: Response) => {
  try {
    const data = await getAidCorpus();
    res.json(data);
  } catch (err) {
    console.error("[AID CORPUS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch Aid corpus." });
  }
});

app.get("/api/rag-corpus", async (_req: Request, res: Response) => {
  try {
    const data = await getRAGCorpus();
    res.json(data);
  } catch (err) {
    console.error("[RAG CORPUS ERROR]", err);
    res.status(500).json({ error: "Failed to fetch RAG corpus." });
  }
});

app.use("/api", renderSurahRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;

app.listen(PORT, () => {
  console.log(`  ➜  Server running at: http://localhost:${PORT}/`);
});