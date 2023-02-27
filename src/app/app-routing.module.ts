import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        loadComponent: () =>
          import('./views/audio-step-view/audio-step-view.component').then(
            (c) => c.AudioStepViewComponent
          ),
      },
    ]),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
