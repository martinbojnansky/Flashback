import { Component, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FfmpegService } from './services/ffmpeg.service';

@Component({
  selector: 'app-video-step-view',
  templateUrl: './video-step-view.component.html',
  styleUrls: ['./video-step-view.component.scss'],
  standalone: true,
  providers: [FfmpegService],
  imports: [RouterModule],
})
export class VideoStepViewComponent {
  @ViewChild('player')
  player!: HTMLVideoElement;

  constructor(protected ffmpegService: FfmpegService) {}

  async selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      console.log('STARTED', file);
      this.ffmpegService.trimFile(file);
    }
  }
}
