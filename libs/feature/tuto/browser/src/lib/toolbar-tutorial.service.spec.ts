import { TestBed } from '@angular/core/testing';

import { ToolbarTutorialService } from './toolbar-tutorial.service';

describe('ToolbarTutorialService', () => {
  let service: ToolbarTutorialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolbarTutorialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
