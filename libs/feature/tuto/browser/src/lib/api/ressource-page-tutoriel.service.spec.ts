import { TestBed } from '@angular/core/testing';

import { RessourcePageTutorielService } from './ressource-page-tutoriel.service';

describe('RessourcePageTutorielService', () => {
  let service: RessourcePageTutorielService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RessourcePageTutorielService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
