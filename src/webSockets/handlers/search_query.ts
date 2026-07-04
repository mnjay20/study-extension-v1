import type { Socket } from "socket.io";
import { Events } from "../../utils/events.js";
import { logger } from "../../utils/logger.js";
import z from "zod";
import { search } from "../../agents/utils/search.js";


const querySchema = z.object({
    query: z.string().min(1, "query is required to search").max(512, "query is too long")
})

export async function searchQueryHandler(socket: Socket) {
    const events = Events
    socket.on(events.SEARCH.QUERY, async (payload) => {
        try {
            const session = socket.data.sessionId
            if (!session) {
                throw new Error("Session not found for socket")
            }
            const parsedQuery = querySchema.safeParse(payload)
            if (!parsedQuery.success) {
                logger.warn("Search query validation failed for socket %s: %O", socket.id, parsedQuery.error);
                throw new Error("Invalid query")
            }
            const { query } = parsedQuery.data
            logger.info(`Invoking rag pipeline for session: ${session} and query: ${query}`);

            const searchAnswer = await search(session, query)

            logger.info(`Generated answer for query: ${query}`);
            socket.emit(events.SEARCH.RESULTS, {
                success: true,
                answer: searchAnswer.answer,
                score: searchAnswer.score,
                chunks: searchAnswer.chunks
            })


        } catch (error) {
            logger.error('Error handling search query event', error)
            socket.emit(events.ERROR.GENERAL, {
                success: false,
                message: error instanceof Error ? error.message : "Error occurred in search query handler"
            })
        }
    })
}