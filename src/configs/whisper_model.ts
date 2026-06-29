import { pipeline } from "@huggingface/transformers";


let transcriber: any = null;

export async function getTranscriber() {
  if (!transcriber) {
    transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-small');
  }
  return transcriber;
}