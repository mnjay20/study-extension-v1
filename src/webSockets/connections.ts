import { nanoid } from "nanoid";
import { getSessionCollection } from "../database/collections.js";
import { Events } from "../utils/events.js";
import { getIO } from "./server.js";
import { SessionSchema } from "../schmas/session_schema.js";
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
        console.log(`connected with ${socket.id}`)
        
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