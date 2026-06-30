import { transcribeWithWorker } from "./utils/audio_transcription.js";
async function test() {
    const result = await transcribeWithWorker("./cache/8atYXJSn7nCE-i-h/0003.wav");
    console.log(result);
}

test();