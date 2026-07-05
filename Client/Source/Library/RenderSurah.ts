// Server/API/RenderSurah.ts
import { renderToVideo } from "Client/Render/Engine/Server";

export async function POST(req: Request) {
  const { scene, timeline, fps, backgroundVideoPath, audioPath } = await req.json();

  const outputPath = `/tmp/renders/${crypto.randomUUID()}.mp4`;

  const result = await renderToVideo({
    scene,
    timeline,
    fps,
    backgroundVideoPath,
    audioPath,
    outputPath,
    fontsDir: "/app/assets/fonts",
    videoBitrate: "6M",           // string, not 4_000_000
  });

  // Upload result.outputPath to storage (S3/etc) and return a fetchable URL,
  // or serve it from a static route — either way, client gets a URL back, not a Blob.
  const url = await uploadAndGetPublicUrl(result.outputPath);
  return Response.json({ url, durationMs: result.durationMs });
}