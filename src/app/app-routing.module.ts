import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'project',
      },
      {
        path: 'project',
        loadComponent: () =>
          import('./views/project-view/project-view.component').then(
            (c) => c.ProjectViewComponent
          ),
      },
    ]),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
