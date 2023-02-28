import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoStepViewComponent } from './video-step-view.component';

describe('VideoStepViewComponent', () => {
  let component: VideoStepViewComponent;
  let fixture: ComponentFixture<VideoStepViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VideoStepViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoStepViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
