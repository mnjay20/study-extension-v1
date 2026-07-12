import { tool } from "langchain";
import z from "zod";
import { logger } from "../../utils/logger.js";
import { getSessionCollection } from "../../database/collections.js";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const inputSchema = z.object({
    timestamp: z.number().min(0).max(10000).describe("The timestamp in seconds for which the frame is to be retrieved."),
    sessionId: z.string().describe("The session ID associated with the video stream."),
})

async function extractFrameFromServer(videoUrl: string, timestampSeconds: number): Promise<string> {
    logger.info(`Getting direct stream URL via yt-dlp for video: ${videoUrl}`);
    const { stdout: streamUrl } = await execPromise(
        `yt-dlp -f "bestvideo[height<=720]/best" -g "${videoUrl}"`,
        { timeout: 15000 }
    );
    
    const cleanStreamUrl = streamUrl.toString().trim();
    if (!cleanStreamUrl) {
        throw new Error("Failed to get stream URL from yt-dlp");
    }

    logger.info(`Extracting frame via ffmpeg at timestamp: ${timestampSeconds}s`);
    const { stdout: buffer } = await execPromise(
        `ffmpeg -ss ${timestampSeconds} -i "${cleanStreamUrl}" -vf "scale=854:-1" -q:v 5 -vframes 1 -f image2pipe -vcodec mjpeg -`,
        { encoding: "buffer", maxBuffer: 10 * 1024 * 1024, timeout: 20000 }
    );

    return buffer.toString("base64");
}

export const getFrame = tool(async ({ timestamp, sessionId }) => {
    logger.info(`getFrame tool invoked for sessionId: ${sessionId} at timestamp: ${timestamp}s`);

    try {
        const sessionCol = await getSessionCollection();
        const session = await sessionCol.findOne({ sessionId });
        if (!session || !session.videoUrl) {
            throw new Error(`Session or video URL not found for session ID: ${sessionId}`);
        }

        const frameData = await extractFrameFromServer(session.videoUrl, timestamp);
        return {
            mimeType: "image/jpeg",
            frameData: frameData
        };
    } catch (error: any) {
        logger.error(`getFrame tool failed for session: ${sessionId} at timestamp: ${timestamp}s: ${error.message}`);
        throw error;
    }
}, {
    name: "getFrame",
    description: "This tool is used to get the frame of a video at a specific timestamp. The input should be a timestamp in seconds, and the output will be the corresponding frame image.",
    schema: inputSchema,
})
