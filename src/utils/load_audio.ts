import { spawn } from "child_process";

export function spawnYtdlp(url: string) {
  const child = spawn(
    "yt-dlp",
    [
      "--format",
      "bestaudio[acodec=opus]/bestaudio/best",
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      "--extractor-args",
      "youtube:player-client=android",
      "--output",
      "-",
      url,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

 

  child.on("error", (err) => {
    console.error("Failed to start yt-dlp:", err);
  });

  return child;
}
