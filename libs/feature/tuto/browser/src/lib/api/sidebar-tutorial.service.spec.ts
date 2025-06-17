import { TestBed } from '@angular/core/testing';

import { SidebarTutorialService } from './sidebar-tutorial.service';

describe('SidebarTutorialService', () => {
  let service: SidebarTutorialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarTutorialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
