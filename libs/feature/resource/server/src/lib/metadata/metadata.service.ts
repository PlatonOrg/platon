import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { InjectRepository } from '@nestjs/typeorm'
import { ACTIVITY_MAIN_FILE, ActivityVariables, EXERCISE_CONFIG_FILE } from '@platon/feature/compiler'
import { ActivityResourceMeta, ExerciseResourceMeta, LATEST, ResourceTypes } from '@platon/feature/resource/common'
import { EntityManager, Repository } from 'typeorm'
import { ResourceDependencyService } from '../dependency'
import {
  ON_CHANGE_FILE_EVENT,
  ON_RELEASE_REPO_EVENT,
  OnChangeFileEventPayload,
  OnReleaseRepoEventPayload,
} from '../files'
import { ResourceFileService } from '../files/file.service'
import { Repo } from '../files/repo'
import { ResourceEntity } from '../resource.entity'
import { ResourceMetaEntity } from './metadata.entity'

type SyncArgs = {
  repo?: Repo
  resource: ResourceEntity
  entityManager?: EntityManager
}

@Injectable()
export class ResourceMetadataService {
  private readonly logger = new Logger(ResourceMetadataService.name)

  constructor(
    @InjectRepository(ResourceMetaEntity)
    private readonly repository: Repository<ResourceMetaEntity>,
    private readonly fileService: ResourceFileService,
    private readonly dependencyService: ResourceDependencyService
  ) {}

  /**
   * Retrieves the metadata for a resource.
   *
   * @remarks
   * - If the metadata does not exist, it creates a new metadata.
   * @param resourceId - The ID of the resource.
   * @param entityManager - Optional. The entity manager to use for database operations.
   * @returns A Promise that resolves to the metadata of the resource.
   */
  async of(resourceId: string, entityManager?: EntityManager): Promise<ResourceMetaEntity> {
    let metadata = entityManager
      ? await entityManager.findOne(ResourceMetaEntity, { where: { resourceId } })
      : await this.repository.findOne({ where: { resourceId } })

    if (!metadata) {
      metadata = entityManager
        ? await entityManager.save(entityManager.create(ResourceMetaEntity, { resourceId }))
        : await this.repository.save(this.repository.create({ resourceId }))
    }

    return metadata
  }

  /**
   * Synchronizes the activity resource metadata on the database.
   *
   * @param args - The arguments for syncing the activity metadata.
   * @returns A promise that resolves to the updated resource metadata entity.
   */
  async syncActivity(args: SyncArgs): Promise<ResourceMetaEntity> {
    const { resource, entityManager } = args
    const meta: ActivityResourceMeta = {
      settings: {},
      versions: [],
    }

    let repo = args.repo
    if (!repo) {
      const info = await this.fileService.repo(resource)
      repo = info.repo
    }

    const [_, data] = await repo.read(ACTIVITY_MAIN_FILE)
    const versions = await repo.versions()

    const content = Buffer.from((await data!).buffer).toString()
    const variables = JSON.parse(content) as ActivityVariables
    const settings = variables.settings

    await this.dependencyService.fromActivity({
      id: resource.id,
      version: LATEST,
      exerciseGroups: variables.exerciseGroups,
      entityManager,
    })

    meta.settings = settings ?? {}
    meta.versions = versions.all

    const metadata = await this.of(resource.id, entityManager)
    metadata.meta = meta

    return entityManager ? await entityManager.save(metadata) : await this.repository.save(metadata)
  }

  /**
   * Synchronizes the exercise resource metadata on the database.
   *
   * @param args - The arguments for synchronizing the metadata.
   * @returns A promise that resolves to the updated resource metadata entity.
   */
  async syncExercise(args: SyncArgs): Promise<ResourceMetaEntity> {
    const { resource, entityManager } = args
    const meta: ExerciseResourceMeta = {
      configurable: false,
      versions: [],
    }

    let repo = args.repo
    if (!repo) {
      const info = await this.fileService.repo(resource)
      repo = info.repo
    }

    const versions = await repo.versions()

    meta.configurable = repo.exists(EXERCISE_CONFIG_FILE)
    meta.versions = versions.all

    const metadata = await this.of(resource.id, entityManager)
    metadata.meta = meta

    return entityManager ? await entityManager.save(metadata) : await this.repository.save(metadata)
  }

  @OnEvent(ON_RELEASE_REPO_EVENT)
  protected async onReleaseRepo(payload: OnReleaseRepoEventPayload): Promise<void> {
    try {
      this.logger.log('Handling ON_RELEASE_REPO_EVENT')
      const { repo, resource } = payload
      if (resource.type === ResourceTypes.ACTIVITY) {
        await this.syncActivity({ repo, resource })
      } else if (resource.type === ResourceTypes.EXERCISE) {
        await this.syncExercise({ repo, resource })
      }
    } catch (error) {
      this.logger.error('Error handling ON_RELEASE_REPO_EVENT', error)
    }
  }

  @OnEvent(ON_CHANGE_FILE_EVENT)
  protected async onChangeFile(payload: OnChangeFileEventPayload): Promise<void> {
    try {
      this.logger.log('Handling ON_CHANGE_FILE_EVENT')
      const { repo, resource, path } = payload
      if (payload.resource.type === ResourceTypes.ACTIVITY) {
        if (path === ACTIVITY_MAIN_FILE) {
          await this.syncActivity({ repo, resource })
        }
      } else if (payload.resource.type === ResourceTypes.EXERCISE) {
        if (path === EXERCISE_CONFIG_FILE || path === EXERCISE_CONFIG_FILE) {
          await this.syncExercise({ repo, resource })
        }
      }
    } catch (error) {
      this.logger.error('Error handling ON_CHANGE_FILE_EVENT', error)
    }
  }
}
