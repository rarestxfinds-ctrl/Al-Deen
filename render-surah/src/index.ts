// render-server/src/index.ts
import express from "express";
import cors from "cors";
import { renderSurahRouter } from "./routes/renderSurah";

const app = express();
app.use(cors()); // lock this down to your app's origin before going to prod

// Only applies to JSON bodies (none of our routes currently use plain JSON
// bodies for large payloads — scene/timeline now travel as multipart fields
// alongside the background file in renderSurahRouter). Keep this small;
// it must NOT be raised to "cover" video uploads, those go through multer.
app.use(express.json({ limit: "10mb" }));

app.use("/api", renderSurahRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;

const server = app.listen(PORT, () => console.log(`Render server listening on :${PORT}`));

// Large background-video uploads and long ffmpeg encodes (multi-hour surahs)
// need generous timeouts — Node's defaults will kill the connection well
// before a 2-hour video finishes uploading or encoding.
server.requestTimeout = 0; // disable overall request timeout
server.headersTimeout = 0;
server.timeout = 0;        // disable idle socket timeout