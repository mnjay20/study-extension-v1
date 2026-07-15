import type { Socket } from "socket.io";
import {
  CreateSessionPayloadSchema,
  JoinSessionPayloadSchema,
  SessionSchema,
  UpdateProgressPayloadSchema,
  UpdateStatusPayloadSchema,
  type CreateSessionPayload,
  type SessionResponse,
  type JoinSessionPayload,
  type SessionType,
  type SessionStatusType,
} from "../../schmas/session_schema.js";
import { Events } from "../../utils/events.js";
import { getSessionCollection, getNotesCollection, getUserCollection } from "../../database/collections.js";
import { nanoid } from "nanoid";
import { redis } from "../../configs/redis.js";
import { logger } from "../../utils/logger.js";
import { rm } from "fs/promises";


/*
export const SessionSchema = z.object({
  sessionId: z.string(),

  userId: z.string(),

  videoTitle: z.string().min(1,"title is needed"),
  videoUrl: z.string().url().min(1,'url is needed'),



  duration: z.number().nonnegative(),



  status: z.enum(["creating",
    "downloading",
    "transcribing",
    "generating_notes",
    "completed",
    "failed",
  ]),

  progress: z.number().min(0).max(100),

  createdAt: z.coerce.date(),
//   updatedAt: z.coerce.date(),
//   processedAt: z.coerce.date().optional(),
});

*/
export function SessionCreateHandler(socket: Socket) {
  const events = Events;
  socket.on(
    events.SESSION.CREATE,
    async (
      payload: CreateSessionPayload,
      callback: (response: SessionResponse) => void,
    ) => {
      // creates a session
      try {
        const parsedPayload = CreateSessionPayloadSchema.safeParse(payload);

        if (!parsedPayload.success) {
          logger.warn("Session creation payload validation failed: %O", parsedPayload.error);
          callback({
            success: false,
            message: "Invalid payload",
          });
          return;
        }

        const { userId, videoTitle, videoUrl, duration } = parsedPayload.data;

        const col = await getSessionCollection();
        if (!col) {
          callback({
            success: false,
            message: "something went wrong getting the session collection",
          });
          return;
        }

        // Check if an active/existing session for the user and video URL already exists
        const existingSession = await col.findOne({ userId, videoUrl });
        if (existingSession) {
          logger.info(`Found existing session: ${existingSession.sessionId} for user: ${userId} and video: ${videoTitle}`);
          callback({
            success: true,
            sessionId: existingSession.sessionId,
            isNew: false,
            status: existingSession.status
          } as any);
          return;
        }

        const sessionId = nanoid(16);
        const session: SessionType = {
          sessionId: sessionId,
          userId,
          videoTitle,
          videoUrl,
          duration,
          status: "creating",
          progress: 0,
          createdAt: new Date(),
        };
        const parsed = SessionSchema.safeParse(session);
        if (!parsed.success) {
          logger.warn("Session format schema validation failed: %O", parsed.error);
          callback({
            success: false,
            message: "Session format is not correct",
          });
          return;
        }

        await col.insertOne(parsed.data); // creates the db object

        // Sync user session mapping in Users collection
        try {
          const userCol = await getUserCollection();
          await userCol.updateOne(
            { userId },
            {
              $addToSet: { sessions: sessionId },
              $setOnInsert: { email: `${userId}@placeholder.com`, createdAt: new Date() },
              $set: { updatedAt: new Date() }
            },
            { upsert: true }
          );
          logger.info(`Session ${sessionId} successfully linked to user "${userId}" in Users collection`);
        } catch (userErr) {
          logger.error(`Failed to link session ${sessionId} to user "${userId}" in Users collection:`, userErr);
        }

        await redis.hset(`session:${sessionId}`, {
          status: "creating",
          progress: 0,
        }); // creates the redis cache object
        await redis.expire(`session:${sessionId}`, 86400);
        socket.data.videoTitle = videoTitle;
        logger.info(`Session successfully created: ${sessionId} for video "${videoTitle}" (user: ${userId})`);
        callback({
          success: true,
          sessionId,
          isNew: true,
          status: "creating"
        } as any);
      } catch (error) {
        logger.error("Error in SessionCreateHandler:", error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

export function SessionJoinHandler(socket: Socket) {
  const events = Events;
  socket.on(
    events.SESSION.JOIN,
    async (
      sessionData: JoinSessionPayload,
      callback: (response: SessionResponse) => void,
    ) => {
      try {
        const parsedPayload = JoinSessionPayloadSchema.safeParse(sessionData);
        if (!parsedPayload.success) {
          logger.warn("Join session schema validation failed for socket %s: %O", socket.id, parsedPayload.error);
          callback({
            success: false,
            message: "Invalid session data",
          });
          return;
        }
        const { sessionId } = parsedPayload.data;

        const col = await getSessionCollection();
        if (!col) {
          callback({
            success: false,
            message: "Database connection failed",
          });
          return;
        }

        // Verify if session exists in MongoDB to prevent stale Redis keys from bypassing verification
        const sessionDb = await col.findOne({ sessionId });
        if (!sessionDb) {
          // Clean up stale Redis cache
          await redis.del(`session:${sessionId}`);
          logger.warn("Join session request failed: session %s does not exist in database", sessionId);
          callback({
            success: false,
            message: "Session does not exist",
          });
          return;
        }

        // Ensure Redis is in sync with MongoDB session state
        await redis.hset(`session:${sessionId}`, {
          status: sessionDb.status,
          progress: sessionDb.progress,
        });
        await redis.expire(`session:${sessionId}`, 86400);

        let currentStatus = sessionDb.status;
        let currentProgress = String(sessionDb.progress);

        await socket.join(sessionId);
        socket.data.sessionId = sessionId;

        if (currentStatus === "creating" || currentStatus === "paused") {
          await redis.hset(`session:${sessionId}`, {
            status: "active",
            lastActivity: new Date().toISOString(),
          });

          if (col) {
            await col.updateOne(
              { sessionId: sessionId },
              { $set: { status: "active" } },
            );
          }
          currentStatus = "active";
        }

        // Check if notes already exist in the database for this sessionId
        const notesCol = await getNotesCollection();
        const notesDoc = await notesCol.findOne({ sessionId });
        const existingNotes = notesDoc ? notesDoc.notes : [];

        const progressNum = currentProgress ? parseInt(currentProgress, 10) : 0;
        logger.info(`Socket ${socket.id} successfully joined session ${sessionId} (status: ${currentStatus}, progress: ${progressNum}, existingNotesCount: ${existingNotes.length})`);
        callback({
          success: true,
          message: `Joined session ${sessionId}`,
          notes: existingNotes,
          status: currentStatus,
          progress: progressNum,
        } as any);
      } catch (error) {
        logger.error("Error in SessionJoinHandler:", error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

export function SessionLeaveHandler(socket: Socket) {
  const events = Events;
  socket.on(
    events.SESSION.LEAVE,
    async (_, callback: (response: SessionResponse) => void) => {
      try {
        const sessionId = socket.data.sessionId;
        if (!sessionId) {
          logger.warn(`Leave session request failed for socket ${socket.id}: socket is not registered to any session`);
          callback({
            success: false,
            message: "No session to leave",
          });
          return;
        }
        socket.leave(sessionId);
        socket.data.sessionId = undefined;
        await redis.hset(`session:${sessionId}`, {
          status: "paused",
          lastActivity: new Date().toISOString(),
        });
        const col = await getSessionCollection();
        if (col) {
          await col.updateOne(
            { sessionId: sessionId },
            { $set: { status: "paused" } },
          );
        }
        logger.info(`Socket ${socket.id} successfully left session ${sessionId}`);
        callback({
          success: true,
          message: `Left session ${sessionId}`,
        });
      } catch (error) {
        logger.error("Error in SessionLeaveHandler:", error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

// update the session progress in db
export function SessionUpdateProgressHandler(socket: Socket) {
  const events = Events;

  socket.on(
    events.SESSION.UPDATE.PROGRESS,
    async (
      progressData: unknown,
      callback: (response: SessionResponse) => void,
    ) => {
      try {
        const sessionId = socket.data.sessionId;
        if (!sessionId) {
          logger.warn(`Update progress request failed for socket ${socket.id}: socket is not registered to any session`);
          callback({
            success: false,
            message: "No session to update",
          });
          return;
        }

        const parsedPayload = UpdateProgressPayloadSchema.safeParse(progressData);
        if (!parsedPayload.success) {
          logger.warn("Update progress schema validation failed for session %s: %O", sessionId, parsedPayload.error);
          callback({
            success: false,
            message: "Invalid progress payload",
          });
          return;
        }
        const { progress } = parsedPayload.data;

        await redis.hset(`session:${sessionId}`, {
          progress,
          lastActivity: new Date().toISOString(),
        });

        const col = await getSessionCollection();
        if (col) {
          const updateResult = await col.updateOne(
            { sessionId: sessionId },
            { $set: { progress } },
          );

          if (updateResult.matchedCount === 0) {
            logger.warn("Update progress failed: session %s not found in database", sessionId);
            callback({
              success: false,
              message: "No session found to update in database",
            });
            return;
          }
        }

        logger.info(`Session ${sessionId} progress updated to ${progress}%`);
        callback({
          success: true,
          message: "Progress updated successfully",
        });
      } catch (error) {
        logger.error("Error in SessionUpdateProgressHandler:", error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

// update the session status in db
export function SessionUpdateStatusHandler(socket: Socket) {
  const events = Events;
  socket.on(
    events.SESSION.UPDATE.STATUS,
    async (
      statusData: unknown,
      callback: (response: SessionResponse) => void,
    ) => {
      try {
        const sessionId = socket.data.sessionId;
        if (!sessionId) {
          logger.warn(`Update status request failed for socket ${socket.id}: socket is not registered to any session`);
          callback({
            success: false,
            message: "No session to update",
          });
          return;
        }

        const parsedPayload = UpdateStatusPayloadSchema.safeParse(statusData);
        if (!parsedPayload.success) {
          logger.warn("Update status schema validation failed for session %s: %O", sessionId, parsedPayload.error);
          callback({
            success: false,
            message: "Invalid status payload",
          });
          return;
        }
        const { status } = parsedPayload.data;

        await redis.hset(`session:${sessionId}`, {
          status,
          lastActivity: new Date().toISOString(),
        });

        const col = await getSessionCollection();
        if (col) {
          const updateResult = await col.updateOne(
            { sessionId: sessionId },
            { $set: { status } },
          );

          if (updateResult.matchedCount === 0) {
            logger.warn("Update status failed: session %s not found in database", sessionId);
            callback({
              success: false,
              message: "No session found to update in database",
            });
            return;
          }
        }

        logger.info(`Session ${sessionId} status updated to "${status}"`);
        callback({
          success: true,
          message: "Status updated successfully",
        });
      } catch (error) {
        logger.error("Error in SessionUpdateStatusHandler:", error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

export function EndSessionHandler(socket: Socket) {
  const events = Events;
  socket.on(
    events.SESSION.END,
    async (_: any, callback: (response: SessionResponse) => void) => {
      try {
        const sessionId = socket.data.sessionId;
        if (!sessionId) {
          logger.warn(`End session request failed for socket ${socket.id}: socket is not registered to any session`);
          callback({
            success: false,
            message: "No session to end",
          });
          return;
        }
        await redis.hset(`session:${sessionId}`, {
          status: "ended",
          lastActivity: new Date().toISOString(),
        });
        socket.leave(sessionId);
        socket.data.sessionId = undefined;

        const col = await getSessionCollection();
        if (!col) {
          callback({
            success: false,
            message: "something went wrong getting the session collection",
          });
          return;
        }

        await redis.del(`audio_queue:${sessionId}`);
        await redis.del(`agent_queue:${sessionId}`);

        try {
          await rm(`cache/${sessionId}`, { recursive: true, force: true });
        } catch (err) {
          logger.error(`Failed to clean up cache directory for session ${sessionId}:`, err);
        }

        await col.updateOne(
          { sessionId: sessionId },
          { $set: { status: "ended" } },
        );

        logger.info(`Session ${sessionId} has been ended and queues cleaned up successfully`);
        callback({
          success: true,
          message: `Ended session ${sessionId}`,
        });
      } catch (error) {
        logger.error("Error in EndSessionHandler:", error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}

