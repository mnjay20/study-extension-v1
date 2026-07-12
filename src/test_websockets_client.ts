import { io } from "socket.io-client";

console.log("Starting WebSocket backend test client with callbacks testing...");

const socket = io("http://localhost:3000", {
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("Connected successfully to WebSocket server on http://localhost:3000");

    // Listen to standard server events
    socket.on("audio:download_started", (data) => {
        console.log("[EVENT] audio:download_started received:", data);
    });

    socket.on("error", (err) => {
        console.log("[EVENT] error received:", err);
    });

    const testUserId = "test-user-id-" + Math.floor(Math.random() * 100000);
    const testEmail = `${testUserId}@example.com`;

    console.log(`Emitting 'user:sync' for User ID: ${testUserId}, Email: ${testEmail}...`);
    socket.emit("user:sync", {
        userId: testUserId,
        email: testEmail
    }, (syncResponse: any) => {
        console.log("Received callback response for 'user:sync':", syncResponse);
        if (syncResponse.success) {
            console.log("User synced successfully!");

            console.log("Emitting 'session:create' event...");
            socket.emit("session:create", {
                userId: testUserId,
                videoTitle: "What is Antigravity",
                videoUrl: "https://www.youtube.com/watch?v=hFNnNVawHhk",
                duration: 60
            }, (createResponse: any) => {
                console.log("Received callback response for 'session:create':", createResponse);
                if (createResponse.success) {
                    const sessionId = createResponse.sessionId;
                    console.log(`Created session successfully. Session ID: ${sessionId}`);

                    console.log(`Emitting 'session:join' event for session ${sessionId}...`);
                    socket.emit("session:join", { sessionId }, (joinResponse: any) => {
                        console.log("Received callback response for 'session:join':", joinResponse);
                        if (joinResponse.success) {
                            console.log("Joined session successfully!");

                            // 🧪 CRITICAL CALLBACK TEST: Emit progress update and status update WITHOUT callback parameters
                            console.log("Emitting 'session:update:progress' WITHOUT callback parameter...");
                            socket.emit("session:update:progress", { progress: 25 });

                            console.log("Emitting 'session:update:status' WITHOUT callback parameter...");
                            socket.emit("session:update:status", { status: "active" });

                            // Wait 2 seconds to make sure server doesn't crash on the above fire-and-forget events
                            setTimeout(() => {
                                console.log("Emitting 'session:leave' WITHOUT callback parameter...");
                                socket.emit("session:leave");

                                setTimeout(() => {
                                    console.log("Verification complete. Disconnecting test client.");
                                    socket.disconnect();
                                    process.exit(0);
                                }, 1000);
                            }, 2000);
                        } else {
                            console.error("Failed to join session:", joinResponse.message);
                            socket.disconnect();
                        }
                    });
                } else {
                    console.error("Failed to create session:", createResponse.message);
                    socket.disconnect();
                }
            });
        } else {
            console.error("Failed to sync user:", syncResponse.message);
            socket.disconnect();
        }
    });
});

socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
    process.exit(1);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server.");
    process.exit(0);
});

// Set a timeout to shut down the test client after 15 seconds
setTimeout(() => {
    console.log("Test finished or timed out. Disconnecting...");
    socket.disconnect();
}, 15000);
