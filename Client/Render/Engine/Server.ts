// Server-only entry point. Import this from API routes / job workers ONLY.
// Never import this file (or FfmpegRender.ts) from client/React code —
// it pulls in node:child_process, node:fs, node:os and will break any
// bundler trying to ship it to the browser.

import "node:child_process"; // fails loudly & early if this ever lands in a browser bundle

export { renderWithFfmpeg } from "../../../render-surah/src/engine/FFmpegRender";
export type { FfmpegRenderOptions, FfmpegRenderResult } from "../../../render-surah/src/engine/Types";

import { renderWithFfmpeg } from "../../../render-surah/src/engine/FFmpegRender";
import type { FfmpegRenderOptions, FfmpegRenderResult } from "../../../render-surah/src/engine/Types";

export async function renderToVideo(opts: FfmpegRenderOptions): Promise<FfmpegRenderResult> {
  return renderWithFfmpeg(opts);
}