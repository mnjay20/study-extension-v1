import { parentPort } from "worker_threads";
import { transcribe } from "../utils/whisper.js";

export type WorkerRes = {
    success : boolean,
    text? : string,
    error? : string
}


parentPort?.on("message", async ({ audioPath }) => {
  try {
    const result = await transcribe(audioPath);

    parentPort?.postMessage({
        success : true,
        text : result
    } as WorkerRes);
  } catch (err) {
    parentPort?.postMessage({
        success : false,
      error: err instanceof Error ? err.message : String(err),
    } as WorkerRes);
  }
});