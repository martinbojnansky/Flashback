import { SafeUrl } from '@angular/platform-browser';

export interface Video {
  id: string;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  file?: File;
  trimStart?: number;
  url?: string;
  safeUrl?: SafeUrl;
}
