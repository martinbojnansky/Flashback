import { Component, ViewChild } from '@angular/core';
import { FfmpegService } from './services/ffmpeg.service';
import { OnsetsService } from './services/onsets.service';

@Component({
  selector: 'app-audio-step-view',
  templateUrl: './audio-step-view.component.html',
  styleUrls: ['./audio-step-view.component.scss'],
  standalone: true,
  providers: [OnsetsService, FfmpegService],
})
export class AudioStepViewComponent {
  @ViewChild('player')
  player!: HTMLVideoElement;

  constructor(
    protected onsetsService: OnsetsService,
    protected ffmpegService: FfmpegService
  ) {}

  async selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      console.log('STARTED', file);
      // this.onsetsService.splitFile(file).subscribe({
      //   next: (files) => {
      //     console.log('COMPLETED', files);
      //   },
      // });
      this.ffmpegService.trimFile(file);
    }
  }
}
