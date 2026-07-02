import type { Socket } from "socket.io";
import { Events } from "../../utils/events.js";
import { redis } from "../../configs/redis.js";
import { transcribeWithWorker } from "../../utils/audio_transcription.js";
import {unlink} from 'fs/promises'
import type { TranscriptChunk } from "../../schmas/transcript_chunk.js";
import { env } from "../../utils/env.js";
import { getIO } from "../server.js";


export function transcriptHandler(socket:Socket){
    const events = Events
    const io = getIO()

    socket.on(events.TRANSCRIPT.NEXT_CHUNK, async (_,callback) => {
        try{
            const sessionId = socket.data.sessionId
            if(!sessionId){
                console.error("Session ID not found for socket:", socket.id);
                socket.emit(events.ERROR.GENERAL, { success : false, message: "Session ID not found" });
                return;
            }
            const audioChunk = await redis.zpopmin(`audio_queue:${sessionId}`);
            if (!audioChunk || audioChunk.length === 0) {
                console.log(`No more audio chunks available for session: ${sessionId}`);
                socket.emit(events.TRANSCRIPT.COMPLETED, { message: "All audio chunks processed" });
                return;
            }
            const paresedChunk = JSON.parse(audioChunk[0]!);
            const transcript  = await transcribeWithWorker(paresedChunk.path);
            await unlink(paresedChunk.path)
            const transcriptChunk : TranscriptChunk = {
                sessionId,
                chunkIndex: paresedChunk.chunkIndex,
                startAt: paresedChunk.chunkIndex * env.CHUNK_SIZE, // Assuming each chunk is 10 seconds long
                endAt: (paresedChunk.chunkIndex + 1) * env.CHUNK_SIZE,
                text: typeof transcript === "string" ? transcript : String(transcript),
                createdAt: new Date().toISOString(),
                }
            
          
            // set transcript chunk in redis hset in a context window

            const isKeyExists = await redis.exists(`context:${sessionId}`);
            if(isKeyExists === 0){
            await redis.hset(`context:${sessionId}`,{
                summary: null,
                previousChunk: null,
                currentChunk: JSON.stringify(transcriptChunk)
            })
            }else{
                const previousChunk = await redis.hget(`context:${sessionId}`,'currentChunk')

                await redis.hset(`context:${sessionId}`,{
                    previousChunk: previousChunk,
                    currentChunk: JSON.stringify(transcriptChunk)
                })
            }
            // will call the agentic pipeline    
            
    




        }catch(err){
            console.error("Error handling next chunk event:", err);
            socket.emit(events.ERROR.GENERAL, { success: false, message: "Error handling next chunk event" });

        }
    })
}