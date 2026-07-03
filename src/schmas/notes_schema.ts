import { z } from "zod";

const HeadingBlock = z.object({
  type: z.literal("heading"),
  level: z.number().min(1).max(6),
  content: z.string(),
});

const ParagraphBlock = z.object({
  type: z.literal("paragraph"),
  content: z.string(),
});

const ListBlock = z.object({
  type: z.literal("list"),
  style: z.enum(["bullet", "numbered"]),
  items: z.array(z.string()),
});

const CodeBlock = z.object({
  type: z.literal("code"),
  language: z.string(),
  content: z.string(),
});

const TableBlock = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const FormulaBlock = z.object({
  type: z.literal("formula"),
  content: z.string(),
});

const CalloutBlock = z.object({
  type: z.literal("callout"),
  variant: z.enum(["info", "warning", "tip", "important"]),
  content: z.string(),
});

const DiagramBlock = z.object({
  type: z.literal("diagram"),
  format: z.enum(["mermaid", "svg", "text"]),
  content: z.string(),
});

const ExampleBlock = z.object({
  type: z.literal("example"),
  title: z.string().optional(),
  content: z.string(),
});

const QuoteBlock = z.object({
  type: z.literal("quote"),
  content: z.string(),
});


const NoteBlock = z.discriminatedUnion("type", [
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  CodeBlock,
  TableBlock,
  FormulaBlock,
  CalloutBlock,
  DiagramBlock,
  ExampleBlock,
  QuoteBlock,
]);

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