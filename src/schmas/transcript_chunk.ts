export type TranscriptChunk = {
  sessionId: string;

  chunkIndex: number;

  startAt: number;

  endAt: number;

  text: string;
}

export type TranscriptChunkWithImage = TranscriptChunk & {image? : string}
