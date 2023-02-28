import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FfmpegService {
  private ffmpegWorker: Worker;

  readonly videoReady$ = new Subject<string>();

  constructor() {
    this.ffmpegWorker = new Worker(
      new URL('../workers/ffmpeg.worker', import.meta.url)
    );
    this.ffmpegWorker.onmessage = (msg) => {
      console.log('FFmpegService', msg);
      if (msg.data.url) {
        this.videoReady$.next(msg.data.url);
      }
    };
  }

  trimFile(file: File) {
    this.ffmpegWorker.postMessage({
      file: file,
      params: [
        '-i',
        file.name,
        '-ss',
        '00:00:02',
        '-to',
        '00:00:05',
        '-c',
        'copy',
        'output.mp4',
      ],
    });
  }
}
