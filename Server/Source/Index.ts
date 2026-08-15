import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import { fileURLToPath } from "url";

import { renderSurahRouter } from "./API/renderSurah.js";
import { getHadithCorpus } from "./API/Hadith.js";
import { getAidCorpus } from "./API/Aid.js";
import { getRAGCorpus } from "./API/RAG.js";
import { 
  Jalb_Matn_Al_Quran, 
  Jalb_Bayanat_As_Surah, 
  Jalb_Aqsam_As_Safahat,
  Jalb_Safahat_Khaam,
  Jalb_Qaimat_At_Tarjamaat_Al_Mutaahah,
  Jalb_Qaimat_At_Tarjamaat_Al_Kalimah_Al_Mutaahah,
  Jalb_Qaimat_An_Naqharah_Al_Mutaahah,
  Jalb_Qaimat_An_Naqharah_Al_Kalimah_Al_Mutaahah
} from "./API/Quran.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust base directory relative to dist/build output directory
const MASAR_USUL_AL_MUTUN = path.resolve(__dirname, "..", "Asset", "Corpus");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 1. Dynamic On-The-Fly Gzip Compressed Download Route
app.get("/Wajihat-Barmajatt-At-Tatbiqat/At-Tanzil/*path", (req, res) => {
  try {
    const rawPath = (req.params as any).path ?? req.params[0] ?? "";
    const Al_Masar_Al_Kham = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath);

    if (!Al_Masar_Al_Kham || Al_Masar_Al_Kham.includes("..")) {
      return res.status(403).json({ Khata: "Mamnu' al-wusul." });
    }

    const Masar_Milaff_Al_Hadaf = path.join(MASAR_USUL_AL_MUTUN, path.normalize(Al_Masar_Al_Kham));

    // Ensure target path stays strictly inside the root directory
    if (!Masar_Milaff_Al_Hadaf.startsWith(MASAR_USUL_AL_MUTUN)) {
      return res.status(403).json({ Khata: "Mamnu' al-wusul." });
    }

    if (!fs.existsSync(Masar_Milaff_Al_Hadaf) || fs.statSync(Masar_Milaff_Al_Hadaf).isDirectory()) {
      return res.status(404).json({ Khata: "Milaff qaidat al-bayanat ghayr mawjud." });
    }

    const Ism_Al_Milaff = path.basename(Masar_Milaff_Al_Hadaf);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${Ism_Al_Milaff}.gz"`);
    res.setHeader("Content-Encoding", "gzip");

    const Dhaffag_Al_Milaff = fs.createReadStream(Masar_Milaff_Al_Hadaf);
    const Idhghat = zlib.createGzip({ level: 6 });

    Dhaffag_Al_Milaff.pipe(Idhghat).pipe(res);
  } catch (err) {
    console.error("[DOWNLOAD ROUTE ERROR]", err);
    if (!res.headersSent) {
      res.status(500).json({ Khata: "Khata' dakhili fi al-khadim." });
    }
  }
});

// 2. Quran API Route
app.get("/Wajihat-Barmajatt-At-Tatbiqat/Al-Quran", (req, res) => {
  try {
    const Malamah_As_Surah = req.query.surah || req.query["as-surah"];
    const Malamah_Naw_Al_Khatt = req.query.fontType || req.query["naw-al-khatt"] || "Iftiradi";
    const Malamah_Aqsam = req.query.segments || req.query["aqsam-as-safahat"];
    const Malamah_As_Safhah_Khaam = req.query["as-safhah"];

    const Malamah_At_Tarjamah = req.query.translation || req.query["at-tarjamah"];
    const Malamah_An_Naqharah = req.query.transliteration || req.query["an-naqharah"];

    const Malamah_Qaimat_Tarjamaat = req.query.translations || req.query["qaimat-at-tarjamaat"];
    const Malamah_Qaimat_Tarjamaat_Kalimah = req.query["qaimat-at-tarjamaat-kalimah"];
    
    const Malamah_Qaimat_Naqharat = 
      req.query.transliterations || 
      req.query["qaimat-an-naqharah"] || 
      req.query["qaimat-an-naqharat"];
      
    const Malamah_Qaimat_Naqharat_Kalimah = req.query["qaimat-an-naqharat-kalimah"];

    // A. List Available Standard Translations
    if (Malamah_Qaimat_Tarjamaat === "true") {
      const qaimat = Jalb_Qaimat_At_Tarjamaat_Al_Mutaahah(MASAR_USUL_AL_MUTUN);
      return res.json({ "Qaimat-At-Tarjamaat": qaimat });
    }

    // B. List Available Word-By-Word Translations
    if (Malamah_Qaimat_Tarjamaat_Kalimah === "true") {
      const qaimat = Jalb_Qaimat_At_Tarjamaat_Al_Kalimah_Al_Mutaahah(MASAR_USUL_AL_MUTUN);
      return res.json({ "Qaimat-At-Tarjamaat-Kalimah": qaimat });
    }

    // C1. List Available Standard Transliterations
    if (Malamah_Qaimat_Naqharat === "true") {
      const qaimat = Jalb_Qaimat_An_Naqharah_Al_Mutaahah(MASAR_USUL_AL_MUTUN);
      return res.json({ "Qaimat-An-Naqharat": qaimat, "Qaimat-An-Naqharah": qaimat });
    }

    // C2. List Available Word-By-Word Transliterations
    if (Malamah_Qaimat_Naqharat_Kalimah === "true") {
      const qaimat = Jalb_Qaimat_An_Naqharah_Al_Kalimah_Al_Mutaahah(MASAR_USUL_AL_MUTUN);
      return res.json({ "Qaimat-An-Naqharat-Kalimah": qaimat });
    }

    // D. Page segment layout metadata
    if (Malamah_Aqsam === "true") {
      const Aqsam_As_Safahat = Jalb_Aqsam_As_Safahat();
      return res.json({ "Aqsam-As-Safahat": Aqsam_As_Safahat });
    }

    // E. Raw page table rows
    if (Malamah_As_Safhah_Khaam === "true") {
      const Safahat_Khaam = Jalb_Safahat_Khaam();
      return res.json({ "As-Safhah": Safahat_Khaam });
    }

    // F. Surah Details
    if (Malamah_As_Surah) {
      const Raqm_As_Surah = Number(Malamah_As_Surah);
      const Naw_Al_Khatt = String(Malamah_Naw_Al_Khatt === "Standard" ? "Iftiradi" : Malamah_Naw_Al_Khatt);

      const Target_Tarjamaat = Malamah_At_Tarjamah
        ? Array.isArray(Malamah_At_Tarjamah)
          ? (Malamah_At_Tarjamah as string[])
          : [String(Malamah_At_Tarjamah)]
        : [];

      const Target_Naqharat = Malamah_An_Naqharah
        ? Array.isArray(Malamah_An_Naqharah)
          ? (Malamah_An_Naqharah as string[])
          : [String(Malamah_An_Naqharah)]
        : [];

      const Bayanat_As_Surah = Jalb_Bayanat_As_Surah(
        Raqm_As_Surah,
        Naw_Al_Khatt,
        Target_Tarjamaat,
        Target_Naqharat
      );

      if (!Bayanat_As_Surah) {
        return res.status(404).json({ Khata: "Lam yatim al-futhur 'ala as-surah." });
      }

      return res.json(Bayanat_As_Surah);
    }

    // G. Default: All Surahs
    const JamI_As_Suwar = Jalb_Matn_Al_Quran();
    return res.json(JamI_As_Suwar);
  } catch (err) {
    console.error("[SERVER ROUTE ERROR]", err);
    res.status(500).json({ Khata: "Khata' dakhili fi al-khadim." });
  }
});

// Additional API Endpoints
app.get("/api/hadith-corpus", async (_req, res) => {
  try {
    const data = await getHadithCorpus();
    res.json(data);
  } catch (err) {
    console.error("[HADITH CORPUS ERROR]", err);
    res.status(500).json({ Khata: "Failed to fetch Hadith corpus." });
  }
});

app.get("/api/aid-corpus", async (_req, res) => {
  try {
    const data = await getAidCorpus();
    res.json(data);
  } catch (err) {
    console.error("[AID CORPUS ERROR]", err);
    res.status(500).json({ Khata: "Failed to fetch Aid corpus." });
  }
});

app.get("/api/rag-corpus", async (_req, res) => {
  try {
    const data = await getRAGCorpus();
    res.json(data);
  } catch (err) {
    console.error("[RAG CORPUS ERROR]", err);
    res.status(500).json({ Khata: "Failed to fetch RAG corpus." });
  }
});

app.use("/api", renderSurahRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;

app.listen(PORT, () => {
  console.log(`  ➜  Server running at: http://localhost:${PORT}/`);
});