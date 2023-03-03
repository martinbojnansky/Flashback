import { SafeUrl } from '@angular/platform-browser';

export interface Video {
  id: string;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  length: number;
  file?: File;
  trimFrom?: number;
  url?: string;
  safeUrl?: SafeUrl;
}
