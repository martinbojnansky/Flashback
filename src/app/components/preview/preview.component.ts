import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  BehaviorSubject,
  combineLatest,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
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
  set audio(value: File | null) {
    this.audio$.next(value);
  }

  @Input()
  set videos(value: Video[] | null) {
    this.videos$.next(value?.sort((a, b) => a.startIndex - b.startIndex) || []);
  }

  readonly src$ = new BehaviorSubject<SafeUrl | null>(null);

  private readonly audio$ = new BehaviorSubject<File | null>(null);
  private readonly videos$ = new BehaviorSubject<Video[]>([]);

  private readonly destroyed$ = new Subject<boolean>();

  constructor(
    protected ffmpegService: FfmpegService,
    protected sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    combineLatest([this.audio$, this.videos$])
      .pipe(
        switchMap(([audio, videos]) =>
          this.ffmpegService.generatePreview(audio, videos)
        ),
        takeUntil(this.destroyed$)
      )
      .subscribe({
        next: (url) =>
          this.src$.next(url ? this.sanitizer.bypassSecurityTrustUrl(url) : ''),
        error: (err) => console.log('preview generation failed', err),
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }
}
