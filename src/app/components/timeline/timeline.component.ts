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
import * as moment from 'moment';
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

  @Input()
  set selectedVideo(value: string | null) {
    this.selectedVideo$.next(value);
  }

  @Output()
  readonly itemSelected = new EventEmitter<string>();

  @Output()
  readonly videoAdded = new EventEmitter<Video>();

  @Output()
  readonly videoRemoved = new EventEmitter<string>();

  @Output()
  readonly videoUpdated = new EventEmitter<Partial<Video>>();

  @ViewChild('timelineContainer')
  timelineContainer!: ElementRef<HTMLDivElement>;

  private readonly audios$ = new BehaviorSubject<number[]>([]);
  private readonly videos$ = new BehaviorSubject<Video[]>([]);
  private readonly selectedVideo$ = new BehaviorSubject<string | null>(null);

  private timeline!: Timeline;
  private readonly dateRef = new Date(2023, 1, 1);

  private readonly destroyed$ = new Subject<boolean>();

  constructor() {}

  ngAfterContentInit(): void {
    combineLatest([this.videos$, this.audios$, this.selectedVideo$])
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: ([videos, audios, selectedVideo]) =>
          this.renderTimeline(videos, audios, selectedVideo),
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  private renderTimeline(
    videos: Video[],
    audios: number[],
    selectedVideo: string | null
  ) {
    if (!this.timelineContainer) {
      return;
    }

    const data = this.createTimelineData(audios, videos);

    if (!this.timeline) {
      console.info('rendering timeline for the first time', data.items);
      this.timeline = this.createTimeline(
        this.timelineContainer.nativeElement,
        data,
        audios
      );
    } else {
      console.info('re-rendering timeline', data.items);
      this.timeline.setData(data);
    }

    if (selectedVideo) {
      this.timeline.setSelection(selectedVideo);
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
        start: this.indexToDate(i),
        end: this.indexToDate(i + 1),
        group: 2,
      });
    });
    videos.forEach((video, i) => {
      items.push({
        id: video.id,
        content: `${video.file?.name || '?'}`,
        editable: { updateTime: true, remove: true, updateGroup: false },
        start: this.indexToDate(video.startIndex),
        end: this.indexToDate(video.endIndex),
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
    },
    audios: number[]
  ) {
    const timeline = new Timeline(
      timelineContainerElement,
      data.items,
      data.groups,
      {
        align: 'left',
        editable: { add: true, remove: true, updateTime: true },
        groupEditable: false,
        snap: (date, scale, step) => {
          date.setMilliseconds(0);
          return date;
        },
        min: this.indexToDate(0),
        max: this.indexToDate(audios.length),
        showMajorLabels: false,
        showMinorLabels: false,
        onAdd: (item) => this.onAddItem(item, audios),
        onRemove: (item) => this.onRemoveItem(item),
        onMove: (item) => this.onUpdateItem(item, audios),
        onUpdate: (item) => this.onUpdateItem(item, audios),
      }
    );

    timeline.on('select', (props) => {
      console.info('item selected', props);
      this.itemSelected.emit(props.items?.[0] || null);
    });

    return timeline;
  }

  private onAddItem(item: TimelineItem, audios: number[]) {
    if (item.group === 1) {
      const video: Video = {
        ...this.getVideoPatch(
          item.start as Date,
          moment(item.start).add(1, 'second').toDate(),
          audios
        ),
        id: uuid(),
      };
      console.info('adding video item', item, video);
      this.videoAdded.emit(video);
    } else if (item.group === 2) {
      console.info('prevent adding audio item', item);
    }
  }

  private onRemoveItem(item: TimelineItem) {
    if (item.group === 1) {
      console.info('removing video item', item);
      this.videoRemoved.emit(item.id as string);
    }
  }

  private onUpdateItem(item: TimelineItem, audios: number[]) {
    if (item.group === 1) {
      const video: Partial<Video> = {
        ...this.getVideoPatch(item.start as Date, item.end as Date, audios),
        id: item.id as string,
      };
      console.info('updating video item', item, video);
      this.videoUpdated.emit(video);
    }
  }

  private getVideoPatch(start: Date, end: Date, audios: number[]) {
    const startIndex = this.dateToIndex(start);
    const endIndex = this.dateToIndex(end);
    const startTime = this.indexToTime(startIndex, audios);
    const endTime = this.indexToTime(endIndex, audios);
    const length = endTime - startTime;
    return {
      ...{ startIndex },
      ...{ startTime },
      ...{ endIndex },
      ...{ endTime },
      ...{ length },
    };
  }

  private indexToDate(index: number): Date {
    return moment(this.dateRef).add(index, 'seconds').toDate();
  }

  private dateToIndex(date: Date): number {
    return moment(date).diff(this.dateRef) / 1000;
  }

  private indexToTime(index: number, audios: number[]): number {
    let time = 0;
    for (let i = 0; i <= index; i++) {
      time += audios[i - 1] || 0;
    }
    return time;
  }
}
