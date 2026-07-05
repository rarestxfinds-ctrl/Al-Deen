import express from "express";
import cors from "cors";
import { renderSurahRouter } from "./API/renderSurah.js";
import { getHadithCorpus } from "./API/Hadith.js";
import { getAidCorpus } from "./API/Aid.js";
import { getQuranCorpus, getServerSurahMeta, type AssembledVerse } from "./API/Quran.js";
import { getRAGCorpus } from "./API/RAG.js"; // 🌟 new

const app = express();
app.use(cors()); 

app.use(express.json({ limit: "10mb" }));

// 🌟 Route: Exposes the Quran corpus directly on the app server runtime instance
app.get("/api/quran-corpus", async (req, res) => {
  try {
    const data = await getQuranCorpus();
    res.json(data);
  } catch (error) {
    console.error("Error in /quran-corpus route:", error);
    res.status(500).json({ error: "Failed to retrieve compiled Quran database matrix." });
  }
});

// 🌟 Route: Single surah lookup, with V1/V2/Standard font variant selection
function selectVariant(verse: AssembledVerse, fontType: string): AssembledVerse {
  if (fontType === "V1" && verse.arabicV1 && verse.wordsV1) {
    return { ...verse, arabic: verse.arabicV1, words: verse.wordsV1 };
  }
  if (fontType === "V2" && verse.arabicV2 && verse.wordsV2) {
    return { ...verse, arabic: verse.arabicV2, words: verse.wordsV2 };
  }
  return verse;
}

app.get("/api/surah/:id", async (req, res) => {
  try {
    const surahId = Number(req.params.id);
    if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
      return res.status(400).json({ error: "Invalid surah id" });
    }

    const surah = await getServerSurahMeta(surahId);
    if (!surah) {
      return res.status(404).json({ error: "Surah not found" });
    }

    const fontType = String(req.query.fontType ?? "Standard");
    const verses = surah.verses.map((v) => selectVariant(v, fontType));

    res.json({ ...surah, verses });
  } catch (error) {
    console.error("Error in /api/surah/:id route:", error);
    res.status(500).json({ error: "Failed to retrieve surah data" });
  }
});

app.get("/api/hadith-corpus", async (req, res) => {
  try {
    const data = await getHadithCorpus();
    res.json(data);
  } catch (error) {
    console.error("Error in /hadith-corpus route:", error);
    res.status(500).json({ error: "Failed to retrieve Hadith corpus" });
  }
});

app.get("/api/aid-corpus", async (req, res) => {
  try {
    const data = await getAidCorpus();
    res.json(data);
  } catch (error) {
    console.error("Error in /aid-corpus route:", error);
    res.status(500).json({ error: "Failed to retrieve Aid corpus database" });
  }
});

// 🌟 Route: Exposes the RAG corpus for retrieval-augmented queries
app.get("/api/rag-corpus", async (req, res) => {
  try {
    const data = await getRAGCorpus();
    res.json(data);
  } catch (error) {
    console.error("Error in /rag-corpus route:", error);
    res.status(500).json({ error: "Failed to retrieve RAG corpus" });
  }
});

// Mounting the multi-part render script endpoint on our core routing block
app.use("/api", renderSurahRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;
const server = app.listen(PORT, () => console.log(`Server listening on :${PORT}`));

// Keep the socket connections completely open for massive Ffmpeg processes
server.requestTimeout = 0; 
server.headersTimeout = 0;
server.timeout = 0;