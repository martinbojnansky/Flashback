import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioPickerComponent } from './audio-picker.component';

describe('AudioPickerComponent', () => {
  let component: AudioPickerComponent;
  let fixture: ComponentFixture<AudioPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AudioPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
