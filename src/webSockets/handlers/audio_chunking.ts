import { readdir } from "fs/promises";
import {
  downloadStartedPayloadSchema,
  type DownloadStartedPayload,
} from "../../schmas/transcript_chunk.js";
import { audioChunker } from "../../utils/audio_chunk.js";
import { env } from "../../utils/env.js";
import { Events } from "../../utils/events.js";
import { getIO } from "../server.js";
import { redis } from "../../configs/redis.js";

export function downloadAndChunkingHandler(socket: any) {
  const io = getIO();
  const events = Events;
  socket.on(
    events.AUDIO.DOWNLOAD_STARTED,
    async (data: DownloadStartedPayload) => {
      const sessionId = socket.data.sessionId;
      try {
         if (!sessionId) {
          console.error("Session ID not found for socket:", socket.id);
          return;
        }
        const parsedData = downloadStartedPayloadSchema.safeParse(data);
        if (!parsedData.success) {
          console.error(
            "Invalid data for download started event:",
            parsedData.error,
          );
          return;
        }

        const { videoUrl, userId } = parsedData.data;

       
        console.log(`Download started for video: ${videoUrl}, user: ${userId}`);

        io.to(sessionId).emit(events.AUDIO.DOWNLOAD_STARTED, {
          success: true,
          message: `Download started for video: ${videoUrl}`,
          videoUrl,
          userId,
        });
        await audioChunker(videoUrl, env.CHUNK_SIZE, sessionId); // Assuming chunk size is from environment variables

        const files = (await readdir(`./cache/${sessionId}`))
          .filter((file) => file.endsWith(".wav"))
          .sort();

        for (const [index, file] of files.entries()) {
          const audioPath = `./cache/${sessionId}/${file}`;

          await redis.zadd(
            `audio_queue:${sessionId}`,
            index,
            JSON.stringify({
              chunkIndex: index,
              path: audioPath,
            }),
          );
        }

        io.to(sessionId).emit(events.AUDIO.CHUNKING_COMPLETED, {
          success: true,
          message: `Audio chunking completed for video: ${videoUrl}`,
          videoUrl,
          userId,
        });
      } catch (err) {
        console.error("Error in downloadStartedHandler:", err);
        io.to(sessionId).emit(events.AUDIO.DOWNLOAD_STARTED, {
          success: false,
          message: `Error processing download started event: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },
  );
}


