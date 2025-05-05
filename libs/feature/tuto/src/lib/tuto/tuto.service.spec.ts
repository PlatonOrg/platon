import { TestBed } from '@angular/core/testing';

import { TutoService } from './tuto.service';

describe('TutoService', () => {
  let service: TutoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
