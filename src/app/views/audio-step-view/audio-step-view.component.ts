import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import * as JSZip from 'jszip';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { OnsetsService } from './services/onsets.service';

@Component({
  selector: 'app-audio-step-view',
  templateUrl: './audio-step-view.component.html',
  styleUrls: ['./audio-step-view.component.scss'],
  standalone: true,
  providers: [OnsetsService],
  imports: [CommonModule, RouterModule],
})
export class AudioStepViewComponent implements OnDestroy {
  readonly srcs$ = new BehaviorSubject<{ url: string; safeUrl: SafeUrl }[]>([]);

  private readonly destroyed$ = new Subject<boolean>();

  constructor(
    protected onsetsService: OnsetsService,
    protected sanitizer: DomSanitizer
  ) {}

  ngOnDestroy(): void {
    this.srcs$.value.forEach((src) => URL.revokeObjectURL(src.url));
    this.destroyed$.next(true);
  }

  selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      this.onsetsService
        .splitFile(file)
        .pipe(takeUntil(this.destroyed$))
        .subscribe({
          next: (blobs) => {
            const srcs = blobs.map((blob, i) => {
              const url = URL.createObjectURL(blob);
              const src = {
                name: `${((i + 1) / 1000).toFixed(3).substring(2)}.mp3`,
                blob: blob,
                url: url,
                safeUrl: this.sanitizer.bypassSecurityTrustUrl(url),
              };
              return src;
            });
            this.srcs$.next(srcs);
            let zip = new JSZip();
            srcs.forEach((src, i) => {
              zip.folder(`${file?.name}.zip`)?.file(src.name, src.blob, {
                compression: 'STORE',
              });
            });
            zip
              .generateAsync({ type: 'blob', compression: 'STORE' })
              .then((zipBlob) => {
                const zipURL = URL.createObjectURL(zipBlob);
                const link = document.createElement('a');
                link.setAttribute('href', zipURL);
                link.setAttribute('download', `${file.name}.zip`);
                link.click();
                URL.revokeObjectURL(zipURL);
              });
          },
        });
    }
  }
}
