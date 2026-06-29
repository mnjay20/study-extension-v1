import { z } from "zod";

export const TranscriptChunkSchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  startAt: z.number().nonnegative(),
  endAt: z.number().nonnegative(),
  text: z.string(),
  createdAt : z.coerce.date()
});

export type TranscriptChunk = z.infer<typeof TranscriptChunkSchema>;

export const TranscriptChunkWithImageSchema =
  TranscriptChunkSchema.extend({
    image: z.string().optional(),
  });

export type TranscriptChunkWithImage = z.infer<
  typeof TranscriptChunkWithImageSchema
>;