import { Injectable } from '@angular/core';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FfmpegService {
  private ffmpegWorker: Worker;

  constructor() {
    this.ffmpegWorker = new Worker(
      new URL('../workers/ffmpeg.worker', import.meta.url)
    );
  }

  trimFile(file: File, start: string, end: string) {
    return from(this.trim(file, start, end));
  }

  private async trim(file: File, start: string, end: string) {
    const promise = new Promise<string>((resolve, reject) => {
      this.ffmpegWorker.onmessage = (msg) => {
        if (msg.data.url) {
          resolve(msg.data.url);
        }
      };
      this.ffmpegWorker.postMessage({
        file: file,
        params: [
          '-i',
          file.name,
          '-ss',
          start,
          '-to',
          end,
          '-c',
          'copy',
          `${file.name}--temp.mp4`,
        ],
      });
    });
    return promise;
  }
}
