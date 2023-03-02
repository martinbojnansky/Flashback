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

  @Output()
  readonly itemSelected = new EventEmitter<string>();

  @Output()
  readonly videoAdded = new EventEmitter<Video>();

  @Output()
  readonly videoRemoved = new EventEmitter<string>();

  @Output()
  readonly videoUpdated = new EventEmitter<[string, number, number]>();

  @ViewChild('timelineContainer')
  timelineContainer!: ElementRef<HTMLDivElement>;

  private readonly audios$ = new BehaviorSubject<number[]>([]);
  private readonly videos$ = new BehaviorSubject<Video[]>([]);

  private timeline!: Timeline;
  private readonly dateRef = new Date(2023, 1, 1);

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
        data,
        this.lengthToDate(audios.length)
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
        start: this.lengthToDate(i),
        end: this.lengthToDate(i + 1),
        group: 2,
      });
    });
    videos.forEach((video, i) => {
      items.push({
        id: video.id,
        content: `${video.file?.name || ''}`,
        editable: { updateTime: true, remove: true, updateGroup: false },
        start: this.lengthToDate(video.start),
        end: this.lengthToDate(video.end),
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
    max: Date
  ) {
    const timeline = new Timeline(
      timelineContainerElement,
      data.items,
      data.groups,
      {
        align: 'left',
        editable: true,
        groupEditable: false,
        snap: (date, scale, step) => {
          date.setMilliseconds(0);
          return date;
        },
        min: 0,
        max: max,
        showMajorLabels: false,
        showMinorLabels: false,
        onAdd: (item) => this.onAddItem(item),
        onRemove: (item) => this.onRemoveItem(item),
        onMove: (item) => this.onUpdateItem(item),
        onUpdate: (item) => this.onUpdateItem(item),
      }
    );

    timeline.on('select', (props) => {
      console.info('item selected', props);
      this.itemSelected.emit(props.items?.[0] || null);
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
        start: this.dateToLength(item.start as Date),
        end: this.dateToLength(
          moment(item.start as Date)
            .add(1, 'second')
            .toDate()
        ),
      });
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

  private onUpdateItem(item: TimelineItem) {
    if (item.group === 1) {
      const event = [
        item.id as string,
        this.dateToLength(item.start as Date),
        this.dateToLength(item.end as Date),
      ];
      console.info('updating video item', item, event);
      this.videoUpdated.emit([
        item.id as string,
        this.dateToLength(item.start as Date),
        this.dateToLength(item.end as Date),
      ]);
    }
  }

  private lengthToDate(length: number): Date {
    return moment(this.dateRef).add(length, 'seconds').toDate();
  }

  private dateToLength(date: Date): number {
    return moment(date).diff(this.dateRef) / 1000;
  }
}
