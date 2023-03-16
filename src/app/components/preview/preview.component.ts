import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { FfmpegService } from '../../services/ffmpeg.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class PreviewComponent {
  @Input()
  set url(value: string | null) {
    this.url$.next(value);
  }

  private readonly url$ = new BehaviorSubject<string | null>(null);

  readonly src$: Observable<SafeUrl | null> = this.url$.pipe(
    map((url) => (url ? this.sanitizer.bypassSecurityTrustUrl(url) : null))
  );

  constructor(
    protected ffmpegService: FfmpegService,
    protected sanitizer: DomSanitizer
  ) {}
}
