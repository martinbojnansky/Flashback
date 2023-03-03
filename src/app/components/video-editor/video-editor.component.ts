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

  private readonly player$ = new ReplaySubject<ElementRef<HTMLVideoElement>>(1);

  private readonly destroyed$ = new Subject<boolean>();

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
          const newVideo = this.getVideoPatch(
            video,
            file,
            this.video?.trimStart
          );
          console.info('video file updated', newVideo);
          this.videoChanged.emit(newVideo);
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
        const newVideo = this.getVideoPatch(video, video.file, start);
        console.info('video start trimmed', newVideo);
        this.videoChanged.emit(newVideo);
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
    return this.jumpTo((video.trimStart || 0) + video.duration, true);
  }

  private getVideoPatch(
    video: Video,
    file: File | undefined,
    trimStart: number | undefined
  ): Video {
    if (video.url) {
      URL.revokeObjectURL(video.url);
    }

    trimStart = trimStart || 0;
    const url = file ? URL.createObjectURL(file) : '';
    return {
      ...video,
      ...{ file },
      ...{ trimStart },
      ...{ url },
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
    };
  }
}
