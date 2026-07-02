import { Annotation } from "@langchain/langgraph";
import { type NotesSchemaType } from '../schmas/notes_schema.js';

export const NotesState = Annotation.Root({
  // Context
  sessionId: Annotation<string>(),

  // Current chunk (the source of truth)
  transcript: Annotation<string>(),

  // Rolling context
  rollingSummary: Annotation<string>(),

  // Previous transcript (for continuity only)
  previousTranscript: Annotation<string>(),

  // Chunk timestamps
  startTimestamp: Annotation<number>(),
  endTimestamp: Annotation<number>(),

  // Notes generated for this chunk
  notes: Annotation<NotesSchemaType | null>(),

  // Whether a visual is required
  needsVisualContext: Annotation<boolean>(),

  // Visual context returned by the tool
  visualContext: Annotation<{
    mimeType: string;
    frameData: string;
  } | null>(),

  // Final output
  output: Annotation<NotesSchemaType | null>(),

  // Error handling
  error: Annotation<string | null>(),
});