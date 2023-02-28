import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
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
  readonly src$ = new Subject<SafeUrl>();

  constructor(
    protected ffmpegService: FfmpegService,
    protected sanitizer: DomSanitizer
  ) {}

  selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      this.ffmpegService.trimFile(file, '00:00:02', '00:00:05').subscribe({
        next: (url) => {
          // TODO: Revoke old url
          this.src$.next(this.sanitizer.bypassSecurityTrustUrl(url));
        },
      }); // TODO: Until destroyed
    }
  }
}
