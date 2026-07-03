import { tool } from "langchain";
import z from "zod";
import { Events } from "../../utils/events.js";
import { getIO } from "../../webSockets/server.js";
import { logger } from "../../utils/logger.js";


const inputSchema = z.object({
    timestamp: z.number().min(0).max(10000).describe("The timestamp in seconds for which the frame is to be retrieved."),
    sessionId: z.string().describe("The session ID associated with the video stream."),
})

const outputSchema = z.object({
    success: z.boolean().describe("Indicates whether the frame retrieval was successful."),
    mimeType: z.string().describe("The MIME type of the retrieved frame image."),
    frameData: z.string().describe("The base64 encoded string of the retrieved frame image."),
})
type outputSchemaType = z.infer<typeof outputSchema>

const events = Events.FRAME
export const getFrame = tool(({ timestamp, sessionId }) => {
    logger.info(`getFrame tool invoked for sessionId: ${sessionId} at timestamp: ${timestamp}s`);
    const io = getIO()
    const response = new Promise<outputSchemaType>((resolve, reject) => {
        io.to(sessionId).timeout(2000).emit(events.REQUEST_CONTEXT, { timestamp }, (err: any, responses: any[]) => {
            if (err) {
                if (responses && responses.length > 0) {
                    const firstSuccess = responses.find(r => r && r.success) as outputSchemaType | undefined;
                    if (firstSuccess) {
                        logger.info(`getFrame tool successfully retrieved frame for session: ${sessionId} at timestamp: ${timestamp}s (from partial timeout responses)`);
                        resolve(firstSuccess);
                        return;
                    }
                }
                logger.error(`getFrame tool failed for session: ${sessionId} at timestamp: ${timestamp}s (Timeout/Error): ${err.message || err}`);
                reject(new Error(`Timeout or error requesting frame: ${err.message || err}`));
            } else if (responses && responses.length > 0) {
                const firstSuccess = responses.find(r => r && r.success) as outputSchemaType | undefined;
                if (firstSuccess) {
                    logger.info(`getFrame tool successfully retrieved frame for session: ${sessionId} at timestamp: ${timestamp}s`);
                    resolve(firstSuccess);
                } else {
                    logger.error(`getFrame tool failed for session: ${sessionId} at timestamp: ${timestamp}s: No client socket returned success=true`);
                    reject(new Error("Failed to retrieve frame (no successful response in list)"));
                }
            } else {
                logger.error(`getFrame tool failed for session: ${sessionId} at timestamp: ${timestamp}s: Zero responses received`);
                reject(new Error("No responses received for frame request"));
            }
        });
    });

    return response.then((response) => {
        return { mimeType: response.mimeType, frameData: response.frameData }
    }).catch((error) => {
        throw error
    })

}, {
    name: "getFrame",
    description: "This tool is used to get the frame of a video at a specific timestamp. The input should be a timestamp in seconds, and the output will be the corresponding frame image.",
    schema: inputSchema,
})

