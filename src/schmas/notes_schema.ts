export interface Notes {
    

    sessionId: string;

    runningSummary: string;

    chapters: Chapter[];

    updatedAt: Date;
}

export interface Chapter {
    id: string;

    title: string;

    startTimestamp: number;

    endTimestamp?: number;

    summary: string;

    topics: Topic[];
}

export interface Topic {
    id: string;

    title: string;

    // definitions: Definition[];

    // points: string[];

    // examples: Example[];

    // images: ImageReference[];

    // code: CodeBlock[];

    // formulas: Formula[];
}