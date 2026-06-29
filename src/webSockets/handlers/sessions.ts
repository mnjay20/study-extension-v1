import type { Socket } from "socket.io";
import {
    CreateSessionPayloadSchema,
  JoinSessionPayloadSchema,
  SessionSchema,
  type CreateSessionPayload,
  type CreateSessionResponse,
  type JoinSessionPayload,
  type SessionType,
} from "../../schmas/session_schema.js";
import { Events } from "../../utils/events.js";
import { getSessionCollection } from "../../database/collections.js";
import { nanoid } from "nanoid";
import { getIO } from "../server.js";

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
    async (payload:CreateSessionPayload, callback : (response: CreateSessionResponse)=>void) => {
      // creates a session
      try {
         const parsedPayload = CreateSessionPayloadSchema.safeParse(payload);

    if (!parsedPayload.success) {
      callback({
        success: false,
        message: "Invalid payload",
      });
      return;
    }

    const { userId, videoTitle, videoUrl, duration } = parsedPayload.data;

        const sessionId = nanoid(16);
        const col = await getSessionCollection();
        if (!col) {
          callback({
            success: false,
            message: "something went wrong getting the session collection",
          });
          return;
        }
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
          callback({
            success: false,
            message: "Session format is not correct",
          });
          return;
        }

        await col.insertOne(parsed.data); // creates the db object

        callback({
          success: true,
          sessionId,
        });
      } catch (error) {
        console.error(error);
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
    async (sessionData: JoinSessionPayload, callback: (response: CreateSessionResponse) => void) => {
      try {

        const parsedPayload = JoinSessionPayloadSchema.safeParse(sessionData);
        if(!parsedPayload.success){
            callback({
                success: false,
                message: "Invalid session data"
            });
            return;
        }
        const { sessionId } = parsedPayload.data;
        
        await socket.join(sessionId);

        callback({
            success: true,
            sessionId: sessionId
        });
    }catch (error) {
        console.error(error);
        callback({
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}
