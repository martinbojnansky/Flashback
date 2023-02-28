import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { FfmpegService } from './services/ffmpeg.service';

@Component({
  selector: 'app-video-editor',
  templateUrl: './video-editor.component.html',
  styleUrls: ['./video-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [FfmpegService],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class VideoEditorComponent implements OnDestroy {
  @Input()
  audioSlices: string[] | null = null;

  readonly src$ = new Subject<SafeUrl>();

  readonly startControl = new FormControl<number>(0);

  private readonly destroyed$ = new Subject<boolean>();

  constructor(
    protected ffmpegService: FfmpegService,
    protected sanitizer: DomSanitizer
  ) {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];
    console.log(file);

    if (file) {
      this.ffmpegService
        .trimFile(file, '00:00:02', '00:00:05')
        .pipe(takeUntil(this.destroyed$))
        .subscribe({
          next: (url) => {
            // TODO: Revoke old url
            this.src$.next(this.sanitizer.bypassSecurityTrustUrl(url));
          },
        });
    }
  }
}
