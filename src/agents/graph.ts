import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { type NotesSchemaType } from "../schmas/notes_schema.js";
import { stateLoader } from "./state_loader.js";
import { notesAgentNode } from "./notes_agent.js";
import { summaryAgentNode } from "./summaryAgent.js";
import { sendAndsaveNode } from "./store_in_db.js";
import { embeddingNode, updateWindowNode, type embeddingWindowType } from "./embedding.js";




export const GraphState = Annotation.Root({
  chunkIndex: Annotation<number>(),
  videoTitle: Annotation<string>(),
  sessionId: Annotation<string>(),
  transcript: Annotation<string>(),
  rollingSummary: Annotation<string>(),
  previousTranscript: Annotation<string>(),
  startTimestamp: Annotation<number>(),
  endTimestamp: Annotation<number>(),
  notes: Annotation<NotesSchemaType | null>(),

  // embeddings related properties
  slidingWindow: Annotation<embeddingWindowType>(),
  windowSize: Annotation<number>(),
  embeddingsCreated: Annotation<number[]>()

  // // Error handling
  // error: Annotation<string | null>(),
});

/*
slidingWindow: NoteChunk[];

    windowSize: number;

    embeddingsCreated: number;
*/


export type State = typeof GraphState.State;

export const graph = new StateGraph(GraphState)
  .addNode("stateLoaderNode", stateLoader)
  .addNode("notesAgentNode", notesAgentNode)
  .addNode("summaryAgentNode", summaryAgentNode)
  .addNode("sendAndsaveNode", sendAndsaveNode)
  .addNode("updateWindowNode", updateWindowNode)
  .addNode("embeddingNode", embeddingNode)
  .addEdge(START, "stateLoaderNode")
  .addEdge("stateLoaderNode", "notesAgentNode")
  .addEdge("notesAgentNode", "summaryAgentNode")
  .addEdge("notesAgentNode", "sendAndsaveNode")
  .addEdge("notesAgentNode", "updateWindowNode")
  .addConditionalEdges('updateWindowNode', (state: State) => {
    return state.slidingWindow.length === state.windowSize ? "embeddingNode" : END
  },
    {
      embeddingNode: "embeddingNode",
      [END]: END
    })
  .addEdge("embeddingNode", END)
  .addEdge("summaryAgentNode", END)
  .addEdge("sendAndsaveNode", END)
  .compile();


