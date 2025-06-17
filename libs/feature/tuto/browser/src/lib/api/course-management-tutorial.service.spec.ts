import { TestBed } from '@angular/core/testing';

import { CourseManagementTutorialService } from './course-management-tutorial.service';

describe('CourseManagementTutorialService', () => {
  let service: CourseManagementTutorialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CourseManagementTutorialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
