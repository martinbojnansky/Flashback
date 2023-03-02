import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { BehaviorSubject, combineLatest, Subject, takeUntil } from 'rxjs';
import { Video } from 'src/app/models/video';
import { uuid } from 'src/app/utils/uuid';
import {
  DataGroupCollectionType,
  DataItemCollectionType,
  Timeline,
  TimelineItem,
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
  set audios(value: number[] | null) {
    this.audios$.next(value || []);
  }

  @Input()
  set videos(value: Video[] | null) {
    this.videos$.next(value || []);
  }

  @Output()
  readonly itemSelected = new EventEmitter<string>();

  @Output()
  readonly videoAdded = new EventEmitter<Video>();

  @ViewChild('timelineContainer')
  timelineContainer!: ElementRef<HTMLDivElement>;

  private readonly audios$ = new BehaviorSubject<number[]>([]);
  private readonly videos$ = new BehaviorSubject<Video[]>([]);

  private timeline!: Timeline;

  private readonly destroyed$ = new Subject<boolean>();

  constructor() {}

  ngAfterContentInit(): void {
    combineLatest([this.videos$, this.audios$])
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: ([videos, audios]) => this.renderTimeline(videos, audios),
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  private renderTimeline(videos: Video[], audios: number[]) {
    if (!this.timelineContainer) {
      return;
    }

    const data = this.createTimelineData(audios, videos);

    if (!this.timeline) {
      console.info('rendering timeline for the first time', data.items);
      this.timeline = this.createTimeline(
        this.timelineContainer.nativeElement,
        data
      );
    } else {
      console.info('re-rendering timeline', data.items);
      this.timeline.setData(data);
    }
  }

  private createTimelineData(audios: number[], videos: Video[]) {
    const groups: DataGroupCollectionType = [
      { id: 1, content: 'VIDEO' },
      { id: 2, content: 'AUDIO' },
    ];
    const items: DataItemCollectionType = [];
    audios.forEach((audio, i) => {
      items.push({
        id: uuid(),
        content: `A${i + 1} (${audio.toFixed(2)}s)`,
        editable: false,
        selectable: false,
        start: this.getSliceStartDate(i),
        end: this.getSliceStartDate(i + 1),
        group: 2,
      });
    });
    videos.forEach((video, i) => {
      const last = items[items.length - 1];
      let start = this.getSliceStartDate(0);
      if (last?.group === 1) {
        start = last.end as Date;
      }
      items.push({
        id: video.id,
        content: `${video.file?.name || ''}`,
        editable: true,
        start: start,
        end: this.getSliceStartDate(i + video.length),
        group: 1,
      });
    });
    return {
      ...{ groups },
      ...{ items },
    };
  }

  private createTimeline(
    timelineContainerElement: HTMLDivElement,
    data: {
      groups: DataGroupCollectionType;
      items: DataItemCollectionType;
    }
  ) {
    const timeline = new Timeline(
      timelineContainerElement,
      data.items,
      data.groups,
      {
        align: 'left',
        editable: true,
        groupEditable: true,
        min: 0,
        // max: this.getSliceStartDate(audios.length),
        showMajorLabels: false,
        showMinorLabels: false,
        onAdd: (item) => this.onAddItem(item),
      }
    );

    timeline.on('select', (props) => {
      console.info('item selected', props);
      this.itemSelected.emit(props.items?.[0] || null);
    });

    timeline.on('changed', (props) => {
      console.info('timeline changed', props);
    });

    return timeline;
  }

  private onAddItem(item: TimelineItem) {
    if (item.group === 1) {
      console.info('adding video item', item);
      this.videoAdded.emit({
        id: uuid(),
        file: undefined,
        length: 1,
      });
    } else if (item.group === 2) {
      console.info('prevent adding audio item', item);
    }
  }

  private getSliceStartDate(index: number): Date {
    if (index >= 999) {
      console.error('maximum timeline onsets 999 reached');
    }
    return new Date(2023, 1, 1, 0, 0, 0, index);
  }
}
