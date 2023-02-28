import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs';
import { FfmpegService } from './services/ffmpeg.service';

@Component({
  selector: 'app-video-step-view',
  templateUrl: './video-step-view.component.html',
  styleUrls: ['./video-step-view.component.scss'],
  standalone: true,
  providers: [FfmpegService],
  imports: [CommonModule, RouterModule],
})
export class VideoStepViewComponent {
  readonly src$ = this.ffmpegService.videoReady$.pipe(
    map((url) => this.sanitizer.bypassSecurityTrustResourceUrl(url))
  );

  constructor(
    protected ffmpegService: FfmpegService,
    protected sanitizer: DomSanitizer
  ) {}

  selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      console.log('STARTED', file);
      this.ffmpegService.trimFile(file);
    }
  }
}
