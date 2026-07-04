// Client-safe barrel. ONLY types and pure functions that don't touch
// node:fs / node:child_process / node:os — safe to import from React/DOM
// preview code without pulling ffmpeg into the browser bundle.
//
// Server code (API routes, job workers) should import from "./server"
// instead, never from here for the actual render call.

export * from "../../../render-surah/src/engine/Types";
export { buildTimeline, activeWordAt } from "../../../render-surah/src/engine/Timeline";
export { pageFontFamily } from "Client/Component/Dialog/Render-Quran/Types";
