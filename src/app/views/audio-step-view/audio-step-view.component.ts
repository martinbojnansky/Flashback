import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { OnsetsService } from './services/onsets.service';

@Component({
  selector: 'app-audio-step-view',
  templateUrl: './audio-step-view.component.html',
  styleUrls: ['./audio-step-view.component.scss'],
  standalone: true,
  providers: [OnsetsService],
  imports: [CommonModule, RouterModule],
})
export class AudioStepViewComponent {
  constructor(
    protected onsetsService: OnsetsService,
    protected sanitizer: DomSanitizer
  ) {}

  readonly srcs$ = new Subject<SafeUrl[]>();

  async selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      console.log('STARTED', file);
      this.onsetsService.splitFile(file).subscribe({
        next: (urls) => {
          console.log('COMPLETED', urls);
          this.srcs$.next(
            urls.map((url) => this.sanitizer.bypassSecurityTrustUrl(url))
          );
        },
      });
    }
  }
}
