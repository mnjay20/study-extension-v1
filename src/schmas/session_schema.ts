import { ObjectId } from "mongodb";
import { z } from "zod";

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

  progress: z.number(),

  createdAt: z.coerce.date(),
//   updatedAt: z.coerce.date(),
//   processedAt: z.coerce.date().optional(),
});

export type SessionType= z.infer<typeof SessionSchema>


export const CreateSessionPayloadSchema = z.object({
  userId: z.string(), // Remove this later when authentication is implemented
  videoTitle: z.string().min(1, "Title is required"),
  videoUrl: z.string().url("Invalid video URL"),
  duration: z.number().nonnegative(),
});

export type CreateSessionPayload = z.infer<
  typeof CreateSessionPayloadSchema
>;

export type CreateSessionResponse =
  | {
      success: true;
      sessionId: string;
    }
  | {
      success: false;
      message: string;
    }
   |
   {
    message : true,
    sessionId : string
   } 

export const JoinSessionPayloadSchema = z.object({
  sessionId: z.string()
})
export type JoinSessionPayload = z.infer<typeof JoinSessionPayloadSchema>;