import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { Video } from 'src/app/models/video';

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

  generatePreview(videos: Video[]) {
    return from(
      new Promise<string>((resolve, reject) => {
        this.ffmpegWorker.onmessage = (msg) => {
          if (msg.data.url) {
            resolve(msg.data.url);
          }
        };
        this.ffmpegWorker.postMessage({
          ...{ videos },
          files: videos.map((v) => v.file),
        });
      })
    );
  }
}
