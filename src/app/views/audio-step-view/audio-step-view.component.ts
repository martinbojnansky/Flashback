import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OnsetsService } from './services/onsets.service';

@Component({
  selector: 'app-audio-step-view',
  templateUrl: './audio-step-view.component.html',
  styleUrls: ['./audio-step-view.component.scss'],
  standalone: true,
  providers: [OnsetsService],
  imports: [RouterModule],
})
export class AudioStepViewComponent {
  constructor(protected onsetsService: OnsetsService) {}

  async selectFile(event: Event) {
    const file: File = (event.target as EventTarget & { files: FileList })
      .files?.[0];

    if (file) {
      console.log('STARTED', file);
      this.onsetsService.splitFile(file).subscribe({
        next: (files) => {
          console.log('COMPLETED', files);
        },
      });
    }
  }
}
