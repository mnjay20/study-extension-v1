import z from "zod";
import type { State } from "./graph.js";
import { logger } from "../utils/logger.js";
import { redis } from "../configs/redis.js";
import { embeddings } from "../configs/gemini.js";
import { getEmbeddingsCollection } from "../database/collections.js";
import { embeddingSchema } from "../schmas/embedding_schema.js";



export const embeddingWindowChunk = z.object({
    chunkIndex: z.number().nonnegative(),
    text: z.string()
})

export type embeddingWindowChunkType = z.infer<typeof embeddingWindowChunk>

export const embeddingWindow = z.array(embeddingWindowChunk)

export type embeddingWindowType = z.infer<typeof embeddingWindow>


// this node will be called when we will have to call the gemini model to get the embeddings

export const updateWindowNode = async (state: State) => {
    try {
        const chapter = state.notes?.chapter ?? "";
        const notestext = state.notes?.topics?.map(topic => {
            const notes = `${topic.title}\n` + topic.blocks.map(block => {
                if (block.type === "heading") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "paragraph") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "list") {
                    return block.type + "\n" + (block.items?.join("\n") ?? "")
                }
                if (block.type === "code") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "table") {
                    const headersStr = block.headers?.join("\t") ?? "";
                    const rowsStr = block.rows?.map(row => row.join("\t")).join("\n") ?? "";
                    return block.type + "\n" + headersStr + "\n" + rowsStr;
                }
                if (block.type === "formula") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "callout") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "diagram") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "example") {
                    return block.type + "\n" + (block.content ?? "")
                }
                if (block.type === "quote") {
                    return block.type + "\n" + (block.content ?? "")
                }
                return "";
            }).join("\n")
            return notes
        }).join("\n") ?? "";

        const finalText = chapter + "\n" + notestext
        const embeddingWindowChunk = {
            chunkIndex: state.chunkIndex,
            text: finalText
        }
        const key = `sliding_embedding_window:${state.sessionId}`;

        // Add the new chunk
        await redis.rpush(key, JSON.stringify(embeddingWindowChunk));

        // Keep only the latest `windowSize` chunks
        await redis.ltrim(key, -state.windowSize, -1);

        // Refresh TTL (optional, but recommended for session data)
        await redis.expire(key, 60 * 60 * 24);

        // Read the current window
        const chunks = await redis.lrange(key, 0, -1);

        logger.info(
            `Successfully updated sliding window for session: ${state.sessionId}`
        );

        return {
            slidingWindow: chunks.map(chunk => JSON.parse(chunk) as embeddingWindowChunkType)
        };

    } catch (error) {
        logger.error(`error accured in updateWindowNode : ${error}`)
        throw new Error(`error accured in updateWindowNode : ${error}`)
    }


}

export const embeddingNode = async (state: State) => {
    try {
        const embeddingWindow = state.slidingWindow;

        if (!embeddingWindow || embeddingWindow.length === 0) {
            logger.error(`No embedding window found for session: ${state.sessionId}`);
            throw new Error(`No embedding window found for session: ${state.sessionId}`);
        }
        const combinedText = embeddingWindow.map(chunk => chunk.text).join("\n");
        const embedding = await embeddings.embedQuery(combinedText);
        const col = await getEmbeddingsCollection()
        const dbEmbedding = embeddingSchema.safeParse({
            sessionId: state.sessionId,
            chunkId: state.chunkIndex,
            notes: combinedText,
            embeddings: embedding,
            createdAt: new Date(),

        })
        if (!dbEmbedding.success) {
            logger.error(`error accured in embeddingNode : ${dbEmbedding.error}`)
            throw new Error(`error accured in embeddingNode : ${dbEmbedding.error}`)
        }
        await col.insertOne(dbEmbedding.data)
        logger.info(
            `Successfully created embeddings for session: ${state.sessionId}`
        );
        return {}
    } catch (error) {
        logger.error(`error accured in embeddingNode : ${error}`)
        throw new Error(`error accured in embeddingNode : ${error}`)
    }

}