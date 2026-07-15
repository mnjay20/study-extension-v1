import type { Socket } from "socket.io";
import { getUserCollection } from "../../database/collections.js";
import { UserDocumentSchema } from "../../schmas/user_document_schema.js";
import { Events } from "../../utils/events.js";
import { logger } from "../../utils/logger.js";

export function UserSyncHandler(socket: Socket) {
  const events = Events;
  
  socket.on(
    events.USER.SYNC,
    async (
      payload: { userId: string; email: string },
      callback?: (response: { success: boolean; message: string }) => void
    ) => {
      try {
        if (!payload || !payload.userId || !payload.email) {
          logger.warn("User sync failed: missing userId or email in payload");
          if (callback) {
            callback({ success: false, message: "Missing userId or email" });
          }
          return;
        }

        const col = await getUserCollection();
        
        // Race-condition free atomic upsert
        await col.updateOne(
          { userId: payload.userId },
          { 
            $set: { 
              email: payload.email,
              updatedAt: new Date()
            },
            $setOnInsert: {
              sessions: [],
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
        logger.info(`User successfully synced: ${payload.userId} (email: ${payload.email})`);

        if (callback) {
          callback({ success: true, message: "User synced successfully" });
        }
      } catch (error) {
        logger.error("Error in UserSyncHandler:", error);
        if (callback) {
          callback({ 
            success: false, 
            message: error instanceof Error ? error.message : "Unknown error in user sync" 
          });
        }
      }
    }
  );
}
