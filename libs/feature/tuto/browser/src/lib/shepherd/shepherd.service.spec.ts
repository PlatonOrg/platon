import { Test, TestingModule } from '@nestjs/testing';
import { ShepherdService } from './shepherd.service';

describe('ShepherdService', () => {
  let service: ShepherdService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShepherdService],
    }).compile();

    service = module.get<ShepherdService>(ShepherdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
