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
import {
  BehaviorSubject,
  combineLatest,
  ReplaySubject,
  Subject,
  takeUntil,
} from 'rxjs';
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
  set onsetLengths(value: number[] | null) {
    this.onsetLengths$.next(value || []);
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
  set timelineContainer(value: ElementRef<HTMLDivElement> | null) {
    if (value) this.timelineContainer$.next(value);
  }

  readonly timelineContainer$ = new ReplaySubject<ElementRef<HTMLDivElement>>(
    1
  );

  private readonly onsetLengths$ = new BehaviorSubject<number[]>([]);
  private readonly videos$ = new BehaviorSubject<Video[]>([]);
  private readonly selectedVideo$ = new BehaviorSubject<string | null>(null);

  private timeline!: Timeline;
  private readonly dateRef = new Date(2023, 1, 1);

  private readonly destroyed$ = new Subject<boolean>();

  constructor() {}

  ngAfterContentInit(): void {
    combineLatest([
      this.timelineContainer$,
      this.videos$,
      this.onsetLengths$,
      this.selectedVideo$,
    ])
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: ([timelineContainer, videos, onsetLengths, selectedVideo]) =>
          this.renderTimeline(
            timelineContainer,
            videos,
            onsetLengths,
            selectedVideo
          ),
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
  }

  private renderTimeline(
    timelineContainer: ElementRef<HTMLDivElement>,
    videos: Video[],
    onsetLengths: number[],
    selectedVideo: string | null
  ) {
    console.log(videos, onsetLengths, selectedVideo);

    const data = this.createTimelineData(onsetLengths, videos);

    if (!this.timeline) {
      console.info('rendering timeline for the first time', data.items);
      this.timeline = this.createTimeline(
        timelineContainer.nativeElement,
        data,
        onsetLengths
      );
    } else {
      console.info('re-rendering timeline', data.items);
      this.timeline.setData(data);
    }

    if (selectedVideo) {
      this.timeline.setSelection(selectedVideo);
    }
  }

  private createTimelineData(onsetLengths: number[], videos: Video[]) {
    const groups: DataGroupCollectionType = [
      { id: 1, content: 'VIDEO' },
      { id: 2, content: 'AUDIO' },
    ];
    const items: DataItemCollectionType = [];
    onsetLengths.forEach((audio, i) => {
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
    onsetLengths: number[]
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
        max: this.indexToDate(onsetLengths.length),
        showMajorLabels: false,
        showMinorLabels: false,
        onAdd: (item) => this.onAddItem(item, onsetLengths),
        onRemove: (item) => this.onRemoveItem(item),
        onMove: (item) => this.onUpdateItem(item, onsetLengths),
        onUpdate: (item) => this.onUpdateItem(item, onsetLengths),
      }
    );

    timeline.on('select', (props) => {
      console.info('item selected', props);
      this.itemSelected.emit(props.items?.[0] || null);
    });

    return timeline;
  }

  private onAddItem(item: TimelineItem, onsetLengths: number[]) {
    if (item.group === 1) {
      const video: Video = {
        ...this.getVideoPatch(
          item.start as Date,
          moment(item.start).add(1, 'second').toDate(),
          onsetLengths
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

  private onUpdateItem(item: TimelineItem, onsetLengths: number[]) {
    if (item.group === 1) {
      const video: Partial<Video> = {
        ...this.getVideoPatch(
          item.start as Date,
          item.end as Date,
          onsetLengths
        ),
        id: item.id as string,
      };
      console.info('updating video item', item, video);
      this.videoUpdated.emit(video);
    }
  }

  private getVideoPatch(start: Date, end: Date, onsetLengths: number[]) {
    const startIndex = this.dateToIndex(start);
    const endIndex = this.dateToIndex(end);
    const startTime = this.indexToTime(startIndex, onsetLengths);
    const endTime = this.indexToTime(endIndex, onsetLengths);
    const duration = endTime - startTime;
    return {
      ...{ startIndex },
      ...{ startTime },
      ...{ endIndex },
      ...{ endTime },
      ...{ duration },
    };
  }

  private indexToDate(index: number): Date {
    return moment(this.dateRef).add(index, 'seconds').toDate();
  }

  private dateToIndex(date: Date): number {
    return moment(date).diff(this.dateRef) / 1000;
  }

  private indexToTime(index: number, onsetLengths: number[]): number {
    let time = 0;
    for (let i = 0; i <= index; i++) {
      time += onsetLengths[i - 1] || 0;
    }
    return time;
  }
}
