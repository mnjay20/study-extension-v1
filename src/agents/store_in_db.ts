import { getNotesCollection } from "../database/collections.js";
import type { LectureNotesType } from "../schmas/notes_schema.js";
import { Events } from "../utils/events.js";
import { getIO } from "../webSockets/server.js";
import type { State } from "./graph.js";
import { logger } from "../utils/logger.js";
// if the notes objects exists add the current notes chunk to the notes array in the database

export const sendAndsaveNode = async (state: State) => {
    if (!state.notes) {
        return;
    }
    try {
        logger.info(`Sending notes chunk to client and saving in DB for session: ${state.sessionId}, chunkIndex: ${state.chunkIndex}`);
        const events = Events.NOTES;
        const io = getIO();
        if (io) {
            io.to(state.sessionId).emit(events.CHUNK_READY, {
                notes: state.notes,
                startAt : state.startTimestamp,
                endAt : state.endTimestamp,
            });
        } else {
            logger.warn(`Socket.IO (io) not initialized. Skipping CHUNK_READY event for session: ${state.sessionId}`);
        }
        
        const col = await getNotesCollection();
        const notesData = await col.findOne({ sessionId: state.sessionId });
        if(!notesData){
            await col.insertOne({
                sessionId: state.sessionId,
                videoTitle: state.videoTitle,
                notes: [state.notes],
                updatedAt: new Date(),
                createdAt: new Date(),
            }as LectureNotesType);
            logger.info(`Created new notes document in database for session: ${state.sessionId}`);
        } else {
            await col.updateOne(
                { sessionId: state.sessionId },
                { 
                    $push: { notes: state.notes as any },
                    $set: { updatedAt: new Date() }
                }
            );
            logger.info(`Appended notes chunk to existing document for session: ${state.sessionId}`);
        }
        return {}
    }catch (error) {
        logger.error("Error in sendAndsaveNode:", error);
        throw new Error(
          `Error in sendAndsaveNode: ${error instanceof Error ? error.message : String(error)}`,
        );
      }


}