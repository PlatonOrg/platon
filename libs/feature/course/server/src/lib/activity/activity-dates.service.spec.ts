import { TestBed } from '@angular/core/testing';

import { ActivityDatesService } from './activity-dates.service';

describe('ActivityDatesService', () => {
  let service: ActivityDatesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ActivityDatesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
