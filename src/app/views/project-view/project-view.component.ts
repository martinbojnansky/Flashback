import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, take, takeUntil, tap } from 'rxjs';
import { AudioPickerComponent } from 'src/app/components/audio-picker/audio-picker.component';
import { VideoEditorComponent } from 'src/app/components/video-editor/video-editor.component';

@Component({
  selector: 'app-project-view',
  templateUrl: './project-view.component.html',
  styleUrls: ['./project-view.component.scss'],
  standalone: true,
  imports: [CommonModule, AudioPickerComponent, VideoEditorComponent],
})
export class ProjectViewComponent implements OnDestroy {
  readonly audioSlices$ = new BehaviorSubject<Blob[]>([]);
  readonly videos$ = new BehaviorSubject<any[]>([]);

  private readonly destroyed$ = new Subject<boolean>();

  constructor() {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  addVideo() {
    return this.videos$.pipe(
      take(1),
      tap((videos) => this.videos$.next([...videos, {}])),
      takeUntil(this.destroyed$)
    );
  }
}
