import { indexToTime } from '../utils/timeline-converters';
import { uuid } from '../utils/uuid';

export interface Video {
  readonly id: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly trimStart: number;
  readonly file?: File;
  readonly url?: string;

  updatePosition(startIndex: number, endIndex: number): Video;
  updateFile(file: File): Video;
  trim(start: number): Video;
}

export class VideoImpl implements Video {
  readonly id: string;

  startIndex = 0;
  endIndex = 0;
  startTime = 0;
  endTime = 0;
  duration = 0;
  trimStart = 0;
  file?: File;
  url?: string;

  readonly onsetLengths: number[];

  constructor(startIndex: number, endIndex: number, onsetLengths: number[]) {
    this.id = uuid();
    this.onsetLengths = onsetLengths;
    this.updatePosition(startIndex, endIndex);
  }

  updatePosition(startIndex: number, endIndex: number) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.startTime = indexToTime(this.startIndex, this.onsetLengths);
    this.endTime = indexToTime(this.endIndex, this.onsetLengths);
    this.duration = this.endTime - this.startTime;
    return this;
  }

  updateFile(file: File) {
    if (this.url) {
      URL.revokeObjectURL(this.url);
    }
    this.file = file;
    this.url = URL.createObjectURL(file);
    return this;
  }

  trim(start: number) {
    this.trimStart = start;
    return this;
  }

  clone() {
    const clone = Object.assign({}, this);
    Object.setPrototypeOf(clone, VideoImpl.prototype);
    return clone;
  }
}
