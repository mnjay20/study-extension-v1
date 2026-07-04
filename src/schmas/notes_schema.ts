import { z } from "zod";

const NoteBlock = z.object({
  type: z.enum([
    "heading",
    "paragraph",
    "list",
    "code",
    "table",
    "formula",
    "callout",
    "diagram",
    "example",
    "quote",
  ]).describe("The type of notes block."),
  content: z.string().optional().describe("The content of the block. Used for heading, paragraph, code, formula, callout, diagram, example, quote."),
  level: z.number().min(1).max(6).optional().describe("The level of the heading block (1-6)."),
  style: z.enum(["bullet", "numbered"]).optional().describe("The style of the list block."),
  items: z.array(z.string()).optional().describe("The items of the list block."),
  language: z.string().optional().describe("The language of the code block."),
  headers: z.array(z.string()).optional().describe("The headers of the table block."),
  rows: z.array(z.array(z.string())).optional().describe("The rows of the table block."),
  variant: z.enum(["info", "warning", "tip", "important"]).optional().describe("The variant/type of callout block."),
  format: z.enum(["mermaid", "svg", "text"]).optional().describe("The format of the diagram block."),
  title: z.string().optional().describe("The title of the example block."),
});

const TopicSchema = z.object({
  title: z.string(),
  blocks: z.array(NoteBlock),
});

export const NotesSchema = z.object({
  chapter: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  topics: z.array(TopicSchema),
});
export type NotesSchemaType = z.infer<typeof NotesSchema>;

export const LecturNotesSchema = z.object({
  sessionId: z.string(),
  videoTitle: z.string(),
  notes: z.array(NotesSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  

})
export type LectureNotesType = z.infer<typeof LecturNotesSchema>

/*
{
  "chapter": "Binary Search",

  "topics": [
    {
      "title": "Binary Search",

      "blocks": [
        {
          "type": "definition",
          "content": "..."
        },
        {
          "type": "bullet_list",
          "items": ["...", "..."]
        },
        {
          "type": "code",
          "language": "Java",
          "content": "..."
        },
        {
          "type": "table",
          "headers": [...],
          "rows": [...]
        },
        {
          "type": "formula",
          "content": "O(log n)"
        }
      ]
    }
  ]
}



Transcript Chunk
        │
        ▼
 Context Loader
(previous transcript + rolling summary)
        │
        ▼
     Notes Agent
        │
        ├──────────────► Emit Notes JSON
        │
        ▼
   Summary Agent
(previous summary + new notes)
        │
        ▼
 Save Updated Summary
        │
        ▼
 Next Transcript Chunk


*/