import type { Socket } from "socket.io";
import { Events } from "../../utils/events.js";
import { redis } from "../../configs/redis.js";
import { transcribeWithWorker } from "../../utils/audio_transcription.js";
import { unlink } from 'fs/promises'
import type { TranscriptChunk } from "../../schmas/transcript_chunk.js";
import { env } from "../../utils/env.js";
import { getIO } from "../server.js";
import { graph } from "../../agents/graph.js";
import { getSessionCollection } from "../../database/collections.js";
import { logger } from "../../utils/logger.js";


export function transcriptHandler(socket: Socket) {
    const events = Events
    const io = getIO()

    socket.on(events.TRANSCRIPT.NEXT_CHUNK, async () => {
        try {
            const sessionId = socket.data.sessionId
            if (!sessionId) {
                throw new Error(`Session ID not found for socket: ${socket.id}`);
            }
            logger.info(`Requested transcription for next chunk in session: ${sessionId}`);
            const audioChunk = await redis.zpopmin(`audio_queue:${sessionId}`);
            if (!audioChunk || audioChunk.length === 0) {
                logger.info(`No more audio chunks available for session: ${sessionId}`);
                socket.emit(events.TRANSCRIPT.COMPLETED, { message: "All audio chunks processed" });
                return;
            }

            const paresedChunk = JSON.parse(audioChunk[0]!);
            logger.info(`Processing chunkIndex: ${paresedChunk.chunkIndex} in session: ${sessionId}`);
            
            let transcript: String;
            try {
                transcript = await transcribeWithWorker(paresedChunk.path);
            } finally {
                try {
                    await unlink(paresedChunk.path);
                } catch (err) {
                    logger.error(`Failed to delete temporary audio file: ${paresedChunk.path}`, err);
                }
            }

            const sessionCol = await getSessionCollection();
            const session = await sessionCol.findOne({ sessionId });
            const videoTitle = session?.videoTitle ?? "Unknown Video";

            const transcriptChunk: TranscriptChunk = {
                sessionId,
                videoTitle,
                chunkIndex: paresedChunk.chunkIndex,
                startAt: paresedChunk.chunkIndex * env.CHUNK_SIZE, // Assuming each chunk is 10 seconds long
                endAt: (paresedChunk.chunkIndex + 1) * env.CHUNK_SIZE,
                text: typeof transcript === "string" ? transcript : String(transcript),
            }


            // set transcript chunk in redis hset in a context window

            const isKeyExists = await redis.exists(`context:${sessionId}`);
            if (isKeyExists === 0) {
                await redis.hset(`context:${sessionId}`, {
                    summary: '',
                    previousChunk: '',
                    currentChunk: JSON.stringify(transcriptChunk)
                })
            } else {
                const previousChunk = await redis.hget(`context:${sessionId}`, 'currentChunk')

                await redis.hset(`context:${sessionId}`, {
                    previousChunk: previousChunk ?? '',
                    currentChunk: JSON.stringify(transcriptChunk)
                })
            }
            await redis.expire(`context:${sessionId}`, 60 * 60 * 24) // expire in 24 hours
            // will call the agentic pipeline takes the sessionId and videoTitle

            logger.info(`Invoking LangGraph pipeline for session: ${sessionId}, chunkIndex: ${transcriptChunk.chunkIndex}`);
            await graph.invoke({
                sessionId,
                videoTitle: transcriptChunk.videoTitle,
                windowSize: 3
            })
            logger.info(`LangGraph pipeline invocation complete for session: ${sessionId}, chunkIndex: ${transcriptChunk.chunkIndex}`);






        } catch (err) {
            logger.error("Error handling next chunk event:", err);
            socket.emit(events.ERROR.GENERAL, { success: false, message: "Error handling next chunk event" });

        }
    })
}