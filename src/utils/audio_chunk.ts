// in this version there is no overlap in the audio chunks


import { spawn } from 'child_process';
import { spawnYtdlp } from './load_audio.js';
import { mkdir } from "fs/promises";


/*    
  '-hide_banner',
  '-loglevel error',
  '-i input.webm',
  '-f segment',
  '-segment_time' '20',
  '-c:a;, 'pcm_s16le',
  '-ar', '16000',
  '-ac', '1', 
  'chunk_%03d.wav'


 */




function ffmpegSpawn(chunk_size: number, sessionId: string) {
    const ffmpeg = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-f', 'segment',
        '-segment_time', `${chunk_size}`,
        '-c:a', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        `./cache/${sessionId}/%04d.wav`
    ])

    ffmpeg.on('error', (err) => {
        console.error("Failed to start ffmpeg:", err)
    })
    ffmpeg.on('close', (code) => {
        if (code !== 0) {
            console.error(`ffmpeg exited with code ${code}`);
        }
    })

    return ffmpeg
}


export async function audioChunker(url: string, chunk_size: number, sessionId: string) {
    await mkdir(`cache/${sessionId}`, { recursive: true });

    const ytdlp = spawnYtdlp(url)
    const ffmpeg = ffmpegSpawn(chunk_size, sessionId)

    ytdlp.stdout.pipe(ffmpeg.stdin)

    ffmpeg.stderr.on("data", (data) => {
        console.error(data.toString());
    });

    ytdlp.on("close", (code) => {
        if (code !== 0) {
            console.error(`yt-dlp exited with code ${code}`);
        }

        ffmpeg.stdin.end()
    });

    ytdlp.stderr.on("data", (data) => {
        console.error(data.toString());
    });
    return new Promise<{ ytdlp: typeof ytdlp, ffmpeg: typeof ffmpeg }>((resolve, reject) => {
        ytdlp.on("close", (code) => {
            if (code !== 0) console.error(`yt-dlp exited with code ${code}`);
            ffmpeg.stdin.end();
        });
        ffmpeg.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`ffmpeg exited with code ${code}`));
            } else {
                resolve({ ytdlp, ffmpeg });
            }
        });
    });
}

// // 'https://www.youtube.com/watch?v=oafxkMv4xnc' <- test url

// audioChunker('https://www.youtube.com/watch?v=5xFRg_TzlAg&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w&index=12', 20, 'hello')