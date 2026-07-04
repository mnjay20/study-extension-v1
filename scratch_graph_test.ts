import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { redis } from "./src/configs/redis.js";
import { getDb } from "./src/database/mongo.js";
import { graph } from "./src/agents/graph.js";

async function main() {
    const sessionId = "test_session_123";
    const videoTitle = "Unit 1 Introduction";
    
    console.log("Connecting to databases...");
    try {
        const db = await getDb();
        console.log("Connected to MongoDB database name:", db.databaseName);

        const redisReady = await redis.ping();
        console.log("Connected to Redis:", redisReady);

        console.log("Setting up mock session context in Redis...");
        const transcriptChunk = {
            sessionId,
            videoTitle,
            chunkIndex: 0,
            startAt: 0,
            endAt: 20,
            text: "Hello everyone, in this video we will discuss about the Unit 1 Introduction."
        };

        await redis.hset(`context:${sessionId}`, {
            summary: "This is a test rolling summary.",
            previousChunk: "",
            currentChunk: JSON.stringify(transcriptChunk)
        });
        await redis.expire(`context:${sessionId}`, 3600);

        console.log("Invoking LangGraph pipeline...");
        const response = await graph.invoke({
            sessionId,
            videoTitle,
            windowSize: 3
        });

        console.log("Pipeline invocation complete!");
        console.log("Output State keys:", Object.keys(response));
        console.log("Notes generated:", JSON.stringify(response.notes, null, 2));

        // Clean up mock data in Redis
        await redis.del(`context:${sessionId}`);
        await redis.del(`sliding_embedding_window:${sessionId}`);
        console.log("Cleaned up Redis context.");

    } catch (e) {
        console.error("Pipeline test failed with error:", e);
    } finally {
        // Force process exit to close any open connections (Redis, MongoDB)
        setTimeout(() => process.exit(0), 1000);
    }
}

main();
