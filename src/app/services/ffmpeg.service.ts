import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Video } from 'src/app/models/video';
import {
  FfmpegWorkerCommand,
  FfmpegWorkerCommands,
  FfmpegWorkerResponse,
} from '../workers/ffmpeg.worker';

@Injectable({
  providedIn: 'root',
})
export class FfmpegService {
  private ffmpegWorker: Worker;
  private updatePreviewRequired: boolean = false;

  readonly previewUrl$ = new BehaviorSubject<string | null>(null);

  constructor() {
    this.ffmpegWorker = new Worker(
      new URL('../workers/ffmpeg.worker', import.meta.url)
    );

    this.ffmpegWorker.onmessage = (msg) => {
      const response = msg.data as FfmpegWorkerResponse;

      switch (response.type) {
        case '_idle':
          this.generatePreview();
          break;
        case 'trimVideo':
          this.updatePreviewRequired = true;
          break;
        case 'generatePreview':
          this.updatePreviewRequired = false;
          if (this.previewUrl$.value) {
            URL.revokeObjectURL(this.previewUrl$.value);
          }
          const url = (response as FfmpegWorkerResponse<'generatePreview'>)
            .payload;
          this.previewUrl$.next(url || null);
          break;
      }
    };
  }

  saveAudio(audio: File) {
    this.cmd('saveAudio', audio);
  }

  saveVideo(video: Video) {
    this.cmd('saveVideo', video);
  }

  trimVideo(video: Video) {
    this.cmd('trimVideo', video);
  }

  buildTimeline(videos: Video[]) {
    this.cmd('buildTimeline', videos);
  }

  generatePreview() {
    if (this.updatePreviewRequired) {
      this.cmd('generatePreview', {});
    }
  }

  private cmd<T extends keyof FfmpegWorkerCommands>(
    type: T,
    payload: FfmpegWorkerCommands[T][0]
  ) {
    this.ffmpegWorker.postMessage(<FfmpegWorkerCommand<T>>{
      ...{ type },
      ...{ payload },
    });
  }
}
