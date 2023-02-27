import { TestBed } from '@angular/core/testing';

import { OnsetsService } from './onsets.service';

describe('OnsetsService', () => {
  let service: OnsetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnsetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
