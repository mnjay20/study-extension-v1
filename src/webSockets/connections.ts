import { nanoid } from "nanoid";
import { getSessionCollection } from "../database/collections.js";
import { Events } from "../utils/events.js";
import { getIO } from "./server.js";
import { SessionSchema } from "../schmas/session_schema.js";
import { logger } from "../utils/logger.js";
import {
  SessionCreateHandler,
  SessionJoinHandler,
  SessionLeaveHandler,
  SessionUpdateProgressHandler,
  SessionUpdateStatusHandler,
  EndSessionHandler,
} from "./handlers/sessions.js";
import { downloadAndChunkingHandler } from "./handlers/audio_chunking.js";
import { transcriptHandler } from "./handlers/transcription.js";

export function registerSocketHandlers() {
    const io = getIO()

    io.on('connection',(socket)=>{
        logger.info(`connected with socket ID: ${socket.id}`);

        // Global error wrapper for all socket event listeners
        const originalOn = socket.on;
        (socket as any).on = function (event: string, listener: (...args: any[]) => void) {
            return originalOn.call(this, event, async (...args: any[]) => {
                try {
                    await listener(...args);
                } catch (error) {
                    logger.error(`Unhandled error in socket event "${event}" on socket ${socket.id}:`, error);
                    socket.emit(Events.ERROR.GENERAL, {
                        success: false,
                        message: error instanceof Error ? error.message : "Internal Server Error",
                    });
                }
            });
        };
        
        // session event handlers
        SessionCreateHandler(socket)
        SessionJoinHandler(socket)
        SessionLeaveHandler(socket)
        SessionUpdateProgressHandler(socket)
        SessionUpdateStatusHandler(socket)
        EndSessionHandler(socket)

        //audio chunking event handlers
        downloadAndChunkingHandler(socket)
        transcriptHandler(socket)
    })
}