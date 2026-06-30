// events.ts

export const Events = {
  SESSION: {
    JOIN: "session:join",
    LEAVE: "session:leave",
    CREATE: "session:create",
    UPDATE: {
      PROGRESS: "session:update:progress",
      STATUS: "session:update:status",
    },
    END: "session:end",
  },

  VIDEO: {
    PLAY: "video:play",
    PAUSE: "video:pause",
    SEEK: "video:seek",
    END: "video:end",
    PLAYBACK_RATE: "video:playback_rate",
  },

  FRAME: {
    REQUEST_CONTEXT: "frame:request_context",
    UPLOAD: "frame:upload",
    RECEIVED: "frame:received",
    PROCESSING: "frame:processing",
    FAILED: "frame:failed",
},

  AUDIO: {
    DOWNLOAD_STARTED: "audio:download_started",
    DOWNLOAD_COMPLETED: "audio:download_completed",
    CHUNKING_COMPLETED: "audio:chunking_completed",
  },

  TRANSCRIPT: {
    CHUNK_READY: "transcript:chunk_ready",
    CORRECTED: "transcript:corrected",
    COMPLETED: "transcript:completed",
},

  VISION: {
    PROCESSING_STARTED: "vision:processing_started",
    CHUNK_READY: "vision:chunk_ready",
    COMPLETED: "vision:completed",
  },

  NOTES: {
    PROCESSING_STARTED: "notes:processing_started",
    CHUNK_READY: "notes:chunk_ready",
    CHAPTER_STARTED: "notes:chapter_started",
    CHAPTER_COMPLETED: "notes:chapter_completed",
    UPDATED: "notes:updated",
    COMPLETED: "notes:completed",
},

  EMBEDDING: {
    STARTED: "embedding:started",
    COMPLETED: "embedding:completed",
  },

  FLASHCARDS: {
    STARTED: "flashcards:started",
    READY: "flashcards:ready",
  },

  SUMMARY: {
    STARTED: "summary:started",
    READY: "summary:ready",
  },

  CHAT: {
    MESSAGE: "chat:message",
    STREAM_START: "chat:stream_start",
    TOKEN: "chat:token",
    STREAM_END: "chat:stream_end",
    ERROR: "chat:error",
  },

  SEARCH: {
    QUERY: "search:query",
    RESULTS: "search:results",
  },

  JOB: {
    QUEUED: "job:queued",
    STARTED: "job:started",
    COMPLETED: "job:completed",
    FAILED: "job:failed",
  },


  USER: {
    ONLINE: "user:online",
    OFFLINE: "user:offline",
  },

  ERROR: {
    GENERAL: "error",
  },
} as const;