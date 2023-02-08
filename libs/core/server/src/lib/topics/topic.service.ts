import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TopicEntity } from './topic.entity';

@Injectable()
export class TopicService {
  constructor(
    @InjectRepository(TopicEntity)
    private readonly repository: Repository<TopicEntity>
  ) { }

  async findAll(): Promise<TopicEntity[]> {
    return this.repository.find();
  }

  async findAndCountAll(): Promise<[TopicEntity[], number]> {
    return this.repository.findAndCount();
  }

  async create(user: Partial<TopicEntity>): Promise<TopicEntity> {
    return this.repository.save(user);
  }

  async update(id: string, changes: Partial<TopicEntity>): Promise<TopicEntity> {
    const topic = await this.repository.findOne({ where: { id } })
    if (!topic) {
      throw new NotFoundException(`Topic not found: ${id}`)
    }
    Object.assign(topic, changes);
    return this.repository.save(topic);
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}
