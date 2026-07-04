import { embeddings, model } from "../../configs/gemini.js";
import { getEmbeddingsCollection } from "../../database/collections.js";
import { env } from "../../utils/env.js";
import { logger } from "../../utils/logger.js";
import { ragAgentPrompt } from "../prompts/prompts.js";
import { createAgent, tool } from "langchain";
import z from "zod";

export async function search(sessionId: string, query: string) {
    try {
        let retrievedDocs: any[] = [];

        const searchNotesTool = tool(async ({ searchQuery }: { searchQuery: string }) => {
            try {
                const embedding = await embeddings.embedQuery(searchQuery);
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

                retrievedDocs = docs;
                return docs.map(chunk => chunk.notes).join("\n\n");
            } catch (err) {
                logger.error(`Error in searchNotesTool for query ${searchQuery}:`, err);
                return "Error: Failed to retrieve notes from vector search.";
            }
        }, {
            name: "searchNotes",
            description: "Searches the lecture notes using vector search to find relevant information.",
            schema: z.object({
                searchQuery: z.string().describe("The search query to match against lecture notes.")
            })
        });

        const ragAgent = createAgent({
            model: model,
            systemPrompt: ragAgentPrompt,
            tools: [searchNotesTool],
            name: "ragAgent"
        });

        const responseMsg = await ragAgent.invoke({
            messages: [
                {
                    role: "user",
                    content: query
                }
            ]
        });

        const messages = responseMsg.messages;
        const lastMessage = messages[messages.length - 1];
        const answer = lastMessage && lastMessage.content
            ? (typeof lastMessage.content === 'string' ? lastMessage.content : String(lastMessage.content))
            : "The answer cannot be determined from the available lecture context.";
        
        const combinedScores = retrievedDocs.length > 0 
            ? retrievedDocs.reduce((total, chunk) => total + chunk.score, 0) / retrievedDocs.length
            : 0;

        return {
            answer,
            score: combinedScores,
            chunks: retrievedDocs.map(chunk => {
                return {
                    chunkId: chunk.chunkId,
                    notes: chunk.notes,
                    createdAt: chunk.createdAt,
                    score: chunk.score
                }
            })
        };

    } catch (error) {
        logger.error("Error in rag:", error)
        throw new Error("Error in search")
    }
}