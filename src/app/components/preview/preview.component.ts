import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BehaviorSubject, Subject, switchMap, takeUntil } from 'rxjs';
import { Video } from 'src/app/models/video';
import { FfmpegService } from './services/ffmpeg.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  providers: [FfmpegService],
})
export class PreviewComponent implements OnInit, OnDestroy {
  @Input()
  set videos(value: Video[] | null) {
    this.videos$.next(value || []);
  }

  readonly src$ = new BehaviorSubject<SafeUrl | null>(null);

  private readonly videos$ = new BehaviorSubject<Video[]>([]);

  private readonly destroyed$ = new Subject<boolean>();

  constructor(
    protected ffmpegService: FfmpegService,
    protected sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.videos$
      .pipe(
        switchMap((videos) => this.ffmpegService.generatePreview(videos)),
        takeUntil(this.destroyed$)
      )
      .subscribe({
        next: (url) =>
          this.src$.next(this.sanitizer.bypassSecurityTrustUrl(url)),
        error: (err) => console.log('preview generation failed', err),
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }
}
