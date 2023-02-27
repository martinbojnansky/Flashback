import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioStepViewComponent } from './audio-step-view.component';

describe('AudioStepViewComponent', () => {
  let component: AudioStepViewComponent;
  let fixture: ComponentFixture<AudioStepViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AudioStepViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AudioStepViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
