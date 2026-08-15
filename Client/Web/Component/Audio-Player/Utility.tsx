export const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const getRepeatLabel = (mode: "none" | "surah" | "page"): string => {
  switch (mode) {
    case "surah":
      return "Surah";
    case "page":
      return "Page";
    default:
      return "Off";
  }
};

export const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2];