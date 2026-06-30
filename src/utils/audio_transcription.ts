import { readdir } from "fs/promises";
import { audioChunker } from "./audio_chunk.js";
import { Worker } from "worker_threads";
import path from "path";
import { type TranscriptChunk } from '../schmas/transcript_chunk.js';
import type { WorkerRes } from "../workers/chunk_worker.js";




// export async function transcriptionPipeline(url: string, chunkSize: number, sessionId: string) {
//   await audioChunker(url, chunkSize, sessionId)

//   const files = (await readdir(`./cache/${sessionId}`)).filter(file => file.endsWith(".wav")).sort()



//   const transcriptChunks = 
//     files.map(async (file, index) => {
//       try {
//         const audioPath = path.resolve("cache", sessionId, file);

//         const transcript = await transcribeWithWorker(audioPath);

//         return {
//           sessionId,
//           chunkIndex: index,
//           startAt: index * chunkSize,
//           endAt: (index + 1) * chunkSize,
//           text: transcript,
//         };
//       } catch (err) {
//         console.error(`Failed to transcribe ${file}:`, err);
//         throw err;


//       }
//     })
  





// }

export async function transcribeWithWorker(audioPath: string) {
  return new Promise<String>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/chunk_worker.js", import.meta.url));

    worker.postMessage({ audioPath });

    worker.once("message", (result: WorkerRes) => {
      if (!result.success) {
        reject(result.error)
      } else {

        resolve(result.text!)
      }
      worker.terminate();
    });

    worker.once("error", (err) => {
      reject(err);
      worker.terminate();
    });

    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}


 
