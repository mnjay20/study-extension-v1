import z from "zod";
import { model } from "../configs/gemini.js";
import { createAgent } from "langchain";
import { summaryAgentPrompt } from "./prompts/prompts.js";
import type { State } from "./graph.js";
import { redis } from "../configs/redis.js";
import { logger } from "../utils/logger.js";


const summary = z.object({
    summary : z.string().describe("The summary of the notes."),
})

// takes the notes and summarizes them into a single summary
export const summaryAgent = createAgent({
    model : model,
    responseFormat : summary,
    systemPrompt : summaryAgentPrompt,
    name : "summaryAgent",
})


export const summaryAgentNode = async (state: State) => {
    try{
        logger.info(`Invoking summary LLM agent for session: ${state.sessionId}`);
        const response = await summaryAgent.invoke({
            messages:[
                {role : 'user', content : `This is the summary:\n${state.rollingSummary}\nThese are the notes:\n${JSON.stringify(state.notes, null, 2)}` }
            ]
        })
        logger.info(`Summary LLM agent call completed for session: ${state.sessionId}`);
        const summary = response.structuredResponse.summary

        await redis.hset(`context:${state.sessionId}`, "summary", summary)
        return {
            rollingSummary : summary,
        }

    }catch (error) {
        logger.error("Error in summaryAgentNode:", error);
        throw new Error(
          `Error in summaryAgentNode: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

}