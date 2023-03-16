import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, take, takeUntil, tap } from 'rxjs';
import { AudioPickerComponent } from 'src/app/components/audio-picker/audio-picker.component';
import { PreviewComponent } from 'src/app/components/preview/preview.component';
import { TimelineComponent } from 'src/app/components/timeline/timeline.component';
import { VideoEditorComponent } from 'src/app/components/video-editor/video-editor.component';
import { Video } from 'src/app/models/video';
import { FfmpegService } from 'src/app/services/ffmpeg.service';

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
  providers: [FfmpegService],
})
export class ProjectViewComponent implements OnDestroy {
  readonly onsetsLengths$ = new BehaviorSubject<number[]>([]);

  readonly videos$ = new BehaviorSubject<Video[]>([]);
  readonly selectedVideo$ = new BehaviorSubject<Video | null>(null);
  readonly previewUrl$ = this.ffmpegService.previewUrl$;

  private readonly destroyed$ = new Subject<boolean>();

  constructor(protected ffmpegService: FfmpegService) {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  pickAudio(file: File | null) {
    if (file) {
      this.ffmpegService.saveAudio(file);
    }
  }

  analyzeAudio(onsetLenghts: number[]) {
    this.onsetsLengths$.next(onsetLenghts);
  }

  addVideo(video: Video) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        videos.push(video);
        this.videos$.next([...videos]);
        this.ffmpegService.buildTimeline(videos);
      }),
      takeUntil(this.destroyed$)
    );
  }

  removeVideo(id: string) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        const index = videos.findIndex((v) => v.id === id);
        const deletedVideo = videos.splice(index, 1)?.[0];
        this.videos$.next([...videos]);
        this.ffmpegService.buildTimeline(videos);
        this.ffmpegService.deleteVideo(
          deletedVideo,
          !videos.some((v) => v.file?.name === deletedVideo.file?.name)
        );
      }),
      takeUntil(this.destroyed$)
    );
  }

  pickVideo(event: [string, File]) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        const index = videos.findIndex((v) => v.id === event[0]);
        const updatedVideo = videos[index].updateFile(event[1]);
        this.videos$.next([...videos]);
        this.selectedVideo$.next(updatedVideo);
        this.ffmpegService.saveVideo(updatedVideo);
        this.ffmpegService.trimVideo(updatedVideo);
      }),
      takeUntil(this.destroyed$)
    );
  }

  trimVideo(event: [string, number]) {
    return this.videos$.pipe(
      take(1),
      tap((videos) => {
        const index = videos.findIndex((v) => v.id === event[0]);
        const updatedVideo = videos[index].trim(event[1]);
        this.videos$.next([...videos]);
        this.selectedVideo$.next(updatedVideo);
        this.ffmpegService.trimVideo(updatedVideo);
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
        this.ffmpegService.buildTimeline(videos);
        this.ffmpegService.trimVideo(updatedVideo);
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
