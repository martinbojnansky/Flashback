import { Injectable } from '@angular/core';
import { from } from 'rxjs';
import { Video } from 'src/app/models/video';
import {
  FfmpegWorkerGeneratePreviewCommand,
  FfmpegWorkerGeneratePreviewResponse,
  FfmpegWorkerResponse,
} from '../workers/ffmpeg.worker';

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

  generatePreview(audio: File | null, videos: Video[]) {
    return from(
      new Promise<string | undefined>((resolve, reject) => {
        this.ffmpegWorker.onmessage = (msg) => {
          const response = msg.data as FfmpegWorkerResponse;
          if (response.type === 'generatePreview') {
            resolve((response as FfmpegWorkerGeneratePreviewResponse).url);
          }
        };
        this.ffmpegWorker.postMessage(<FfmpegWorkerGeneratePreviewCommand>{
          type: 'generatePreview',
          ...{ audio },
          ...{ videos },
        });
      })
    );
  }
}
