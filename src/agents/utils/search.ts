import { embeddings, model } from "../../configs/gemini.js";
import { getEmbeddingsCollection } from "../../database/collections.js";
import { env } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";
import { ragPrompt } from "../prompts/prompts.js";


export async function search(sessionId: string, query: string) {
    try {
        const embedding = await embeddings.embedQuery(query);
        const col = await getEmbeddingsCollection();
        const docs = await col
            .aggregate([
                {
                    $vectorSearch: {
                        index: env.VECTOR_INDEX,
                        path: "embeddings",
                        queryVector: embedding,
                        filter: {
                            sessionId: sessionId,
                        },
                        numCandidates: 100,
                        limit: 3,
                    },
                },
                {
                    $project: {
                        _id: 0,
                        sessionId: 1,
                        chunkId: 1,
                        notes: 1,
                        createdAt: 1,
                        score: {
                            $meta: "vectorSearchScore",
                        },
                    },
                },
            ])
            .toArray();

        const combinedNotesText = docs.map(chunk => chunk.notes).join('\n\n')

        const combinedScores = docs.length > 0 
            ? docs.reduce((total, chunk) => total + chunk.score, 0) / docs.length
            : 0;

        logger.info(`Found ${docs.length} similar documents for query: ${query}`);
        logger.info(`generating answer from the retrived docs`)

        const promptText = ragPrompt
            .replace("{{retrieved_chunks}}", combinedNotesText)
            .replace("{{question}}", query);

        const responseMsg = await model.invoke(promptText);
        const answer = typeof responseMsg.content === 'string' ? responseMsg.content : String(responseMsg.content);

        return {
            answer,
            score: combinedScores,
            chunks: docs.map(chunk => {
                return {
                    chunkId: chunk.chunkId,
                    notes: chunk.notes,
                    createdAt: chunk.createdAt,
                    score: chunk.score
                }
            })
        }

    } catch (error) {
        logger.error("Error in rag:", error)
        throw new Error("Error in search")
    }
}