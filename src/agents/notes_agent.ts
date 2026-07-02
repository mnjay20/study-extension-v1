
import { createAgent } from "langchain";
import { model } from "../configs/gemini.js";
import { NotesSchema } from "../schmas/notes_schema.js";
import { notesAgentPrompt } from "./prompts/prompts.js";
import { getFrame } from "./tools/image.js";

export const notesAgent = createAgent({
    model : model,
    systemPrompt: notesAgentPrompt,
    responseFormat : NotesSchema,
    tools : [getFrame],
    name : "notesAgent",
})