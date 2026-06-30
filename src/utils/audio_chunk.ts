// in this version there is no overlap in the audio chunks


import { spawn } from 'child_process';
import { spawnYtdlp } from './load_audio.js';
import { mkdir, rm } from "fs/promises";
import { getIO } from '../webSockets/server.js';
import { Events } from './events.js';



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
  
    return spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-f', 'segment',
        '-segment_time', `${chunk_size}`,
        '-c:a', 'pcm_s16le',
        '-ar', '16000',
        '-ac', '1',
        `./cache/${sessionId}/%04d.wav`
    ]);
}


export async function audioChunker(url: string, chunk_size: number, sessionId: string) {
    await rm(`cache/${sessionId}`, { recursive: true, force: true });
    await mkdir(`cache/${sessionId}`, { recursive: true });

    const ytdlp = spawnYtdlp(url);
    const ffmpeg = ffmpegSpawn(chunk_size, sessionId);

    ytdlp.stdout.pipe(ffmpeg.stdin);

    ffmpeg.stderr.on("data", (data) => {
        console.error("ffmpeg stderr:", data.toString());
    });

    ytdlp.stderr.on("data", (data) => {
        console.error("yt-dlp stderr:", data.toString());
    });
    const io = getIO();
    const events = Events;
    return new Promise<{ ytdlp: typeof ytdlp, ffmpeg: typeof ffmpeg }>((resolve, reject) => {
        let finished = false;

        const handleError = (err: Error) => {
            if (finished) return;
            finished = true;

            if (ytdlp.exitCode === null && !ytdlp.killed) {
                ytdlp.kill();
            }
            if (ffmpeg.exitCode === null && !ffmpeg.killed) {
                ffmpeg.kill();
            }

            if (io) {
                io.to(sessionId).emit(events.ERROR.GENERAL, {
                    sessionId,
                    error: err.message,
                });
            }

            reject(err);
        };

        ytdlp.on("error", (err) => {
            handleError(new Error(`yt-dlp process error: ${err.message}`));
        });

        ffmpeg.on("error", (err) => {
            handleError(new Error(`ffmpeg process error: ${err.message}`));
        });

        ytdlp.stdout.on("error", (err) => {
            handleError(new Error(`yt-dlp stdout stream error: ${err.message}`));
        });

        ffmpeg.stdin.on("error", (err) => {
            handleError(new Error(`ffmpeg stdin stream error: ${err.message}`));
        });

        ffmpeg.stderr.on("error", (err) => {
            handleError(new Error(`ffmpeg stderr stream error: ${err.message}`));
        });

        ytdlp.stderr.on("error", (err) => {
            handleError(new Error(`yt-dlp stderr stream error: ${err.message}`));
        });

        ytdlp.on("close", (code) => {
            if (finished) return;
            if (code !== 0) {
                handleError(new Error(`yt-dlp exited with code ${code}`));
            } else {
                ffmpeg.stdin.end();
            }
        });

        ffmpeg.on("close", (code) => {
            if (finished) return;
            finished = true;
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