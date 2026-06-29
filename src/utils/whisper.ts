import fs from 'fs';
import pkg from 'wavefile';
import { getTranscriber } from '../configs/whisper_model.js';
const { WaveFile } = pkg;

/**
 * Transcribes a WAV file locally using Transformers.js (v3)
 * @param {string} audioFilePath - Path to the WAV audio file
 */
export async function transcribe(audioFilePath : string) {
  try{
  console.log('Loading pipeline and Whisper model (this may take a moment)...');
  
  // Initialize the automatic speech recognition pipeline using Hugging Face Transformers.js (v3)
  const transcriber = await getTranscriber()
  console.log('Reading audio file...');
  const buffer = fs.readFileSync(audioFilePath);
  const wav = new WaveFile(buffer);

  // Normalize bit depth to 32-bit floating point and resample to 16000Hz (required by Whisper)
  console.log('Resampling to 16kHz and normalizing bit depth...');
  wav.toBitDepth('32f');
  wav.toSampleRate(16000);

  // Get raw float samples
  let samples : any= wav.getSamples(false, Float32Array);

  // Downmix to mono if multi-channel (stereo)
  if (Array.isArray(samples)) {
    console.log(`Downmixing ${samples.length} channels to mono...`);
    const numChannels = samples.length;
    const numSamples = samples[0].length;
    const mono = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; ++i) {
      let sum = 0;
      for (let c = 0; c < numChannels; ++c) {
        sum += samples[c][i];
      }
      mono[i] = sum / numChannels;
    }
    samples = mono;
  }

  console.log('Transcribing...');
  const start = Date.now();
  
  // Run the audio through the model
  const result : any= await transcriber(samples);

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n--- Transcription Done in ${duration}s ---`);
  
  // 1. Direct clean transcript logging

  return result.text
}catch(error){
  console.error("transcription failed")
  throw error
}

  // 2. Optional: Log the raw result object to see individual chunks and timestamps
  // console.log('\nRAW OBJECT:', JSON.stringify(result, null, 2));
}

// Example usage
