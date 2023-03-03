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
import { BehaviorSubject, map, Subject, take, takeUntil } from 'rxjs';
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
  player!: ElementRef<HTMLVideoElement>;

  readonly video$ = new BehaviorSubject<Video | null>(null);

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
            this.video?.trimFrom
          );
          console.info('video file updated', newVideo);
          this.videoChanged.emit(newVideo);
        }
      }),
      takeUntil(this.destroyed$)
    );
  }

  trim(from: number) {
    return this.video$.pipe(
      take(1),
      map((video) => {
        if (!video) {
          return;
        }
        this.player.nativeElement.pause();
        this.player.nativeElement.currentTime = from;
        const newVideo = this.getVideoPatch(video, video.file, from);
        console.info('video start trimmed', newVideo);
        this.videoChanged.emit(newVideo);
      }),
      takeUntil(this.destroyed$)
    );
  }

  jumpTo(time: number) {
    this.player.nativeElement.pause();
    this.player.nativeElement.currentTime = time || 0;
  }

  private getVideoPatch(
    video: Video,
    file: File | undefined,
    trimFrom: number | undefined
  ): Video {
    if (video.url) {
      URL.revokeObjectURL(video.url);
    }

    trimFrom = trimFrom || 0;
    const url = file ? URL.createObjectURL(file) : '';
    return {
      ...video,
      ...{ file },
      ...{ trimFrom },
      ...{ url },
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(url),
    };
  }
}
