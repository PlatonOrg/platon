import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from "@nestjs/typeorm";
import { AnnouncementEntity } from "./announcement.entity"
import { Repository } from "typeorm";
//import { NotificationService } from "@cisstech/nge-ide/core";
import { NotFoundResponse } from "@platon/core/common";
import { UserRoles } from "@platon/core/common";
import { AnnouncementFilters } from '@platon/feature/announcement/common'



@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name)

  constructor(
    @InjectRepository(AnnouncementEntity) private readonly repository: Repository<AnnouncementEntity>,
  ) {}

  async create(announcement: Partial<AnnouncementEntity>): Promise<AnnouncementEntity> {
    const newAnnouncennouncement = await this.repository.save(this.repository.create(announcement))
    // Notifier les utilisateurs ciblés
    this.logger.log(`[${newAnnouncennouncement.id}] - ${newAnnouncennouncement.title} - a été créé`)
    if (newAnnouncennouncement.active) {
      // On publie l'annonce
    }
    return newAnnouncennouncement
  }

  async update(id: string, changes: Partial<AnnouncementEntity>): Promise<AnnouncementEntity> {
    const annoucement = await this.findById(id)
    const wasActive = annoucement.active

    Object.assign(annoucement, changes)
    const updated = await this.repository.save(annoucement)
    if (!wasActive && updated.active) {
      // On fait l'annonce
    }
    return annoucement
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.delete(id)
    if (result.affected === 0) {
      throw new NotFoundException(`Annonce avec id ${id} non trouvée`)
    }
    this.logger.log(`[${id}] - Annonce a été supprimée`)
  }

  async search(filters: AnnouncementFilters = {}): Promise<[AnnouncementEntity[], number]> {
    const query = this.repository.createQueryBuilder('announcement')
    query.leftJoinAndSelect('announcement.publisher', 'publisher')

    const search = filters.search?.trim()
    if (search) {
      query.andWhere(
        `(
          announcement.title ILIKE :search OR
          announcement.description ILIKE :search
        )`,
        { search: `%${search}%` }
      )
    }

    if (filters.active !== undefined) {
      query.andWhere('announcement.active = :active', { active: filters.active })
    }


    query.orderBy('announcement.created_at', 'DESC')


    if (filters.offset) {
      query.offset(filters.offset)
    }

    if (filters.limit) {
      query.limit(filters.limit)
    }

    const [items, count] = await query.getManyAndCount()
    return [items, count]
  }

  async findById(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.repository.findOne({
      where: { id },
      relations: ['publisher'],
    })

    if (!announcement) {
      throw new NotFoundResponse(`Annonce avec id ${id} non trouvée`)
    }
    return announcement
  }


  async getVisibleForUser(userId: string, userRole: UserRoles, filters: AnnouncementFilters = {}): Promise<[AnnouncementEntity[], number]> {
    const queryBuilder = this.repository.createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.publisher', 'publisher')
      .where('announcement.active = :active', { active: true });

    queryBuilder.andWhere(`
      (announcement."targetedRoles" IS NULL OR
       array_length(announcement."targetedRoles", 1) IS NULL OR
       :userRole = ANY(announcement."targetedRoles"))
    `, { userRole });


    if (filters.search) {
      queryBuilder.andWhere('(announcement.title ILIKE :search OR announcement.description ILIKE :search)',
        { search: `%${filters.search}%` });
    }

    if (filters.limit) {
      queryBuilder.take(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.skip(filters.offset);
    }

    // Tri par date de création
    queryBuilder.orderBy('announcement.createdAt', 'DESC');

    try {
      const [items, count] = await queryBuilder.getManyAndCount();
      return [items, count];
    } catch (error) {
      // @ts-ignore
      this.logger.error(`Erreur lors de la récupération des annonces: ${error.message}`);
      throw error;
    }
  }

}
