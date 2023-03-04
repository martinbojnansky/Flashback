import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import {
  BehaviorSubject,
  combineLatest,
  map,
  ReplaySubject,
  Subject,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { Video } from 'src/app/models/video';

@Component({
  selector: 'app-video-editor',
  templateUrl: './video-editor.component.html',
  styleUrls: ['./video-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class VideoEditorComponent implements OnDestroy {
  @Input()
  set video(value: Video | null) {
    this.video$.next(value);
  }

  @Output()
  readonly videoChanged = new EventEmitter<Video>();

  @ViewChild('player')
  set player(value: ElementRef<HTMLVideoElement> | null) {
    if (value) this.player$.next(value);
  }

  readonly video$ = new BehaviorSubject<Video | null>(null);

  readonly src$ = this.video$.pipe(
    map((video) =>
      video?.url ? this.sanitizer.bypassSecurityTrustUrl(video?.url) : null
    )
  );

  private readonly player$ = new ReplaySubject<ElementRef<HTMLVideoElement>>(1);

  private readonly destroyed$ = new Subject<boolean>();

  private shouldAutopause: boolean = false;

  constructor(protected sanitizer: DomSanitizer) {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  selectFile(event: Event) {
    return this.video$.pipe(
      take(1),
      map((video) => {
        if (!video) {
          return;
        }

        const file: File = (event.target as EventTarget & { files: FileList })
          .files?.[0];

        if (file) {
          video.updateFile(file);
          console.info('video file updated', video);
          this.videoChanged.emit(video);
        }
      }),
      takeUntil(this.destroyed$)
    );
  }

  trimStart(start: number) {
    return combineLatest([this.player$, this.video$]).pipe(
      take(1),
      map(([player, video]) => {
        if (!video) {
          return;
        }
        player.nativeElement.pause();
        player.nativeElement.currentTime = start;
        const trimmedVideo = video.trim(start);
        console.info('video start trimmed', trimmedVideo);
        this.videoChanged.emit(trimmedVideo);
      }),
      takeUntil(this.destroyed$)
    );
  }

  jumpTo(time?: number | null, pause?: boolean) {
    return this.player$.pipe(
      take(1),
      tap((player) => {
        if (pause) player.nativeElement.pause();
        if (time) player.nativeElement.currentTime = time;
      }),
      takeUntil(this.destroyed$)
    );
  }

  jumpToTrimStart(video: Video) {
    return this.jumpTo(video.trimStart, true);
  }

  jumpToTrimEnd(video: Video) {
    return this.jumpTo(video.trimStart + video.duration, true);
  }

  onTimeUpdate(player: HTMLVideoElement, video: Video) {
    // In case the video is playing in trim region, pause it at its end.
    const trimEnd = video.trimStart + video.duration;
    const afterTrimEnd = player.currentTime >= trimEnd;
    if (this.shouldAutopause && afterTrimEnd) {
      player.pause();
      player.currentTime = trimEnd;
      this.shouldAutopause = false;
    } else {
      const playing = !!(
        player.currentTime > 0 &&
        !player.paused &&
        !player.ended &&
        player.readyState > 2
      );
      const afterTrimStart = player.currentTime > video.trimStart;
      const beforeTrimEnd = player.currentTime < trimEnd;
      const withinTrimRegion = afterTrimStart && beforeTrimEnd;
      this.shouldAutopause = playing && withinTrimRegion;
    }
  }
}
