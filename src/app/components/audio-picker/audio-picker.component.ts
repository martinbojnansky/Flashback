import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { OnsetsService } from './services/onsets.service';

@Component({
  selector: 'app-audio-picker',
  templateUrl: './audio-picker.component.html',
  styleUrls: ['./audio-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [OnsetsService],
  imports: [CommonModule],
})
export class AudioPickerComponent implements OnDestroy {
  @Output()
  readonly analyzed = new EventEmitter<number[]>();

  readonly busy$ = new BehaviorSubject<boolean>(false);

  private readonly destroyed$ = new Subject<boolean>();

  constructor(
    protected onsetsService: OnsetsService,
    protected sanitizer: DomSanitizer
  ) {}

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      this.busy$.next(true);
      this.onsetsService
        .analyzeFile(file)
        .pipe(takeUntil(this.destroyed$))
        .subscribe({
          next: (slices) => this.analyzed.emit(slices),
          complete: () => this.busy$.next(false),
        });
    }
  }
}
