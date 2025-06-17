import { TestBed } from '@angular/core/testing';

import { TutorialSelectorService } from './tutorial-selector.service';

describe('TutorialSelectorService', () => {
  let service: TutorialSelectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutorialSelectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
