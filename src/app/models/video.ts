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

  get startIndex() {
    return this._startIndex;
  }

  get endIndex() {
    return this._endIndex;
  }

  get startTime() {
    return this._startTime;
  }

  get endTime() {
    return this._endTime;
  }

  get duration() {
    return this._duration;
  }

  get trimStart() {
    return this._trimStart;
  }

  get file() {
    return this._file;
  }

  get url() {
    return this._url;
  }

  private _startIndex = 0;
  private _endIndex = 0;
  private _startTime = 0;
  private _endTime = 0;
  private _duration = 0;
  private _trimStart = 0;
  private _file?: File;
  private _url?: string;

  private readonly _onsetLengths: number[];

  constructor(startIndex: number, endIndex: number, onsetLengths: number[]) {
    this.id = uuid();
    this._onsetLengths = onsetLengths;
    this.updatePosition(startIndex, endIndex);
  }

  updatePosition(startIndex: number, endIndex: number) {
    this._startIndex = startIndex;
    this._endIndex = endIndex;
    this._startTime = indexToTime(this.startIndex, this._onsetLengths);
    this._endTime = indexToTime(this.endIndex, this._onsetLengths);
    this._duration = this.endTime - this.startTime;
    return this;
  }

  updateFile(file: File) {
    if (this.url) {
      URL.revokeObjectURL(this.url);
    }
    this._file = file;
    this._url = URL.createObjectURL(file);
    return this;
  }

  trim(start: number) {
    this._trimStart = start;
    return this;
  }
}
