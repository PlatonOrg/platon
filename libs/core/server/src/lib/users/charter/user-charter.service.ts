import { Injectable } from '@nestjs/common'
import { UserCharterEntity } from './user-charter.entity'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'

@Injectable()
export class UserCharterService {
  constructor(@InjectRepository(UserCharterEntity) private readonly repository: Repository<UserCharterEntity>) { }

  async acceptUserCharter(userId: string): Promise<UserCharterEntity> {
    await this.repository.update(userId, { acceptedUserCharter: true })
    return this.findUserCharterById(userId)
  }

  async findUserCharterById(userId: string): Promise<UserCharterEntity> {
    let userCharter = await this.repository.findOne({ where: { id: userId } })
    if (!userCharter) {
      userCharter = await this.repository.save(this.repository.create({ id: userId, acceptedUserCharter: false }))
    }
    return userCharter
  }
}
