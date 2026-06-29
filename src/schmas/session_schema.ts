export interface Session {
  
    id: string;

    userId: string;

    videoTitle: string;
    videoUrl: string;

    videoId?: string;
    channelName?: string;

    thumbnailUrl?: string;

    duration: number;

    // language: string;

    // source: "youtube" | "upload";

    status:
        | "queued"
        | "downloading"
        | "transcribing"
        | "generating_notes"
        | "completed"
        | "failed";

    progress: number;

    createdAt: Date;
    updatedAt: Date;
    processedAt?: Date;
}