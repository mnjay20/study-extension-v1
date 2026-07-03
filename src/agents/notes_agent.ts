import { createAgent } from "langchain";
import { model } from "../configs/gemini.js";
import { NotesSchema } from "../schmas/notes_schema.js";
import { notesAgentPrompt } from "./prompts/prompts.js";
import { getFrame } from "./tools/image.js";
import type { State } from "./graph.js";
import { getIO } from "../webSockets/server.js";
import { Events } from "../utils/events.js";
import { logger } from "../utils/logger.js";

export const notesAgent = createAgent({
  model: model,
  systemPrompt: notesAgentPrompt,
  responseFormat: NotesSchema,
  tools: [getFrame],
  name: "notesAgent",
});

const events = Events.NOTES;
export const notesAgentNode = async (state: State) => {
  try {
    const io = getIO();
    if (io) {
        io.to(state.sessionId).emit(events.PROCESSING_STARTED);
    }
    logger.info(`Invoking notes LLM agent for session: ${state.sessionId}, chunkIndex: ${state.chunkIndex}`);
    const response = await notesAgent.invoke({
      messages: [
        {
          role: "user",
          content: `${JSON.stringify({ 
                videoTitle : state.videoTitle,
                transcript : state.transcript,
                rollingSummary : state.rollingSummary,
                previousTranscript : state.previousTranscript,
                startTimestamp : state.startTimestamp,
                endTimestamp : state.endTimestamp,
                sessionId : state.sessionId,
                chunkIndex : state.chunkIndex,
          })
            }`,
        },
      ],
    });
    logger.info(`Notes LLM agent call completed for session: ${state.sessionId}, chunkIndex: ${state.chunkIndex}`);
    
    
    const notes = response.structuredResponse
    
    return {
        notes : notes,
    }

  } catch (error) {
    logger.error("Error in notesAgentNode:", error);
    throw new Error(
      `Error in notesAgentNode: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
