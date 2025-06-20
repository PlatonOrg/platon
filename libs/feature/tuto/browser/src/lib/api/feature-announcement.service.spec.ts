import { TestBed } from '@angular/core/testing';

import { FeatureAnnouncementService } from './feature-announcement.service';

describe('FeatureAnnouncementService', () => {
  let service: FeatureAnnouncementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FeatureAnnouncementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
