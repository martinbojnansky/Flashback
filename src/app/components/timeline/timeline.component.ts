import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';
import {
  DataGroupCollectionType,
  DataItemCollectionType,
  Timeline,
} from 'vis-timeline';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  providers: [],
})
export class TimelineComponent implements AfterContentInit, OnDestroy {
  @Input()
  set audioSlices(value: number[] | null) {
    this.audioSlices$.next(value || []);
  }

  private readonly audioSlices$ = new BehaviorSubject<number[]>([]);

  private timeline!: Timeline;

  private readonly destroyed$ = new Subject<boolean>();

  @ViewChild('timelineContainer')
  timelineContainer!: ElementRef<HTMLDivElement>;

  constructor() {}

  ngAfterContentInit(): void {
    combineLatest([this.audioSlices$])
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: ([audioSlices]) => this.renderTimeline(audioSlices),
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  private renderTimeline(audioSlices: number[]) {
    if (!this.timelineContainer) {
      return;
    }

    const items: DataItemCollectionType = [];
    audioSlices.forEach((audioSlice, i) => {
      items.push({
        id: i,
        content: `A${i + 1} (${audioSlice.toFixed(2)}s)`,
        editable: false,
        start: this.getSliceStartDate(i),
        end: this.getSliceStartDate(i + 1),
        group: 2,
      });
    });

    items.push({
      id: audioSlices.length,
      content: 'V..',
      editable: true,
      start: this.getSliceStartDate(0),
      end: this.getSliceStartDate(1),
      group: 1,
    });

    console.info('rendering timeline', items);

    const groups: DataGroupCollectionType = [
      { id: 1, content: 'VIDEO' },
      { id: 2, content: 'AUDIO' },
    ];

    this.timeline = new Timeline(
      this.timelineContainer.nativeElement,
      items,
      groups,
      {
        editable: true,
        min: 1,
        max: this.getSliceStartDate(audioSlices.length),
        onAdd: (item) => {
          if (item.group === 2) {
            console.log('prevent add music', item);
            this.timeline.setData({ ...{ groups }, ...{ items } });
          }
        },
        showMajorLabels: false,
        showMinorLabels: true,
      }
    );
  }

  private getSliceStartDate(index: number): Date {
    if (index >= 999) {
      console.error('maximum timeline onsets 999 reached');
    }
    return new Date(2023, 1, 1, 0, 0, 0, index);
  }
}
