import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, take, takeUntil, tap } from 'rxjs';
import { AudioPickerComponent } from 'src/app/components/audio-picker/audio-picker.component';
import { PreviewComponent } from 'src/app/components/preview/preview.component';
import { TimelineComponent } from 'src/app/components/timeline/timeline.component';
import { VideoEditorComponent } from 'src/app/components/video-editor/video-editor.component';
import { Video } from 'src/app/models/video';

@Component({
  selector: 'app-project-view',
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AudioPickerComponent,
    VideoEditorComponent,
    TimelineComponent,
    PreviewComponent,
  ],
})
export class ProjectViewComponent implements OnDestroy {
  readonly audioFile$ = new BehaviorSubject<File | null>(null);
  readonly onsetsLengths$ = new BehaviorSubject<number[]>([
    // 1.0346666666666666, 1.0453333333333332, 2.08, 1.056, 1.0346666666666666,
    // 2.037333333333333, 0.032, 1.0666666666666667, 1.0132291666666666,
  ]);

  readonly videos$ = new BehaviorSubject<Video[]>([]);
  readonly selectedVideo$ = new BehaviorSubject<Video | null>(null);

  private readonly destroyed$ = new Subject<boolean>();

  constructor() {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  updateOnsetLengths(onsetLenghts: number[]) {
    this.onsetsLengths$.next(onsetLenghts);
  }

  addVideo(video: Video) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => this.videos$.next([...videos, video])),
      takeUntil(this.destroyed$)
    );
  }

  removeVideo(id: string) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        const index = videos.findIndex((v) => v.id === id);
        videos.splice(index, 1);
        this.videos$.next([...videos]);
      }),
      takeUntil(this.destroyed$)
    );
  }

  updateVideo(video: Video) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        const index = videos.findIndex((v) => v.id === video.id);
        const updatedVideo = (videos[index] = video);
        this.videos$.next([...videos]);
        this.selectedVideo$.next(updatedVideo);
      }),
      takeUntil(this.destroyed$)
    );
  }

  updateVideoPosition(event: [string, number, number]) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        const index = videos.findIndex((v) => v.id === event[0]);
        const updatedVideo = videos[index].updatePosition(event[1], event[2]);
        this.videos$.next([...videos]);
        this.selectedVideo$.next(updatedVideo);
      }),
      takeUntil(this.destroyed$)
    );
  }

  selectVideo(id: string | null) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        if (id) {
          const index = videos.findIndex((v) => v.id === id);
          this.selectedVideo$.next(videos[index]);
        } else {
          this.selectedVideo$.next(null);
        }
      }),
      takeUntil(this.destroyed$)
    );
  }
}
