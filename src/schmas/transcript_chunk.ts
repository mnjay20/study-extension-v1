import { z } from "zod";


export const downloadStartedPayloadSchema = z.object({
  videoUrl: z.string().url().min(1, "video url is required"),
  userId: z.string().min(1, "user id is required"),
})
export type DownloadStartedPayload = z.infer<typeof downloadStartedPayloadSchema>

export const TranscriptChunkSchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  startAt: z.number().nonnegative(),
  endAt: z.number().nonnegative(),
  text: z.string(),
  createdAt : z.string().transform((str) => new Date(str).toISOString()),
});

export type TranscriptChunk = z.infer<typeof TranscriptChunkSchema>;

export const TranscriptChunkWithImageSchema =
  TranscriptChunkSchema.extend({
    image: z.string().optional(),
  });

export type TranscriptChunkWithImage = z.infer<
  typeof TranscriptChunkWithImageSchema
>;