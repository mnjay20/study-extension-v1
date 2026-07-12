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
        
        // Find existing user
        const existingUser = await col.findOne({ userId: payload.userId });
        
        if (existingUser) {
          // Update email and timestamp
          await col.updateOne(
            { userId: payload.userId },
            { 
              $set: { 
                email: payload.email,
                updatedAt: new Date()
              } 
            }
          );
          logger.info(`User successfully updated: ${payload.userId} (email: ${payload.email})`);
        } else {
          // Insert new user document
          const newUser = UserDocumentSchema.parse({
            userId: payload.userId,
            email: payload.email,
            sessions: [],
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await col.insertOne(newUser);
          logger.info(`New user successfully registered: ${payload.userId} (email: ${payload.email})`);
        }

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
