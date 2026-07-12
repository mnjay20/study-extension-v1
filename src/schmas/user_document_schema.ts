import { z } from "zod";

export const UserDocumentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email format"),
  sessions: z.array(z.string()).default([]),
  createdAt: z.coerce.date().default(() => new Date()),
  updatedAt: z.coerce.date().default(() => new Date())
});

export type UserDocument = z.infer<typeof UserDocumentSchema>;
