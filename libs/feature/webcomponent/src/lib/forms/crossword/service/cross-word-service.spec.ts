import { TestBed } from '@angular/core/testing';

import { CrossWordService } from './cross-word-service';

describe('CrossWordService', () => {
  let service: CrossWordService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrossWordService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
