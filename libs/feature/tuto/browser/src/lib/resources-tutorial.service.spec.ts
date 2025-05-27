import { TestBed } from '@angular/core/testing';

import { ResourcesTutorialService } from './resources-tutorial.service';

describe('ResourcesTutorialService', () => {
  let service: ResourcesTutorialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResourcesTutorialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
