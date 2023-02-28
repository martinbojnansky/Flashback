import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'audio',
      },
      {
        path: 'audio',
        loadComponent: () =>
          import('./views/audio-step-view/audio-step-view.component').then(
            (c) => c.AudioStepViewComponent
          ),
      },
      {
        path: 'video',
        loadComponent: () =>
          import('./views/video-step-view/video-step-view.component').then(
            (c) => c.VideoStepViewComponent
          ),
      },
    ]),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
