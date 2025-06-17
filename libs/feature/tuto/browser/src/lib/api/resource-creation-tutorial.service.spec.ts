import { TestBed } from '@angular/core/testing';

import { ResourceCreationTutorialService } from './resource-creation-tutorial.service';

describe('ResourceCreationTutorialService', () => {
  let service: ResourceCreationTutorialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResourceCreationTutorialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
