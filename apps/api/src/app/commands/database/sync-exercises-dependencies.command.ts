import { Injectable, Logger } from '@nestjs/common'
import { EXERCISE_MAIN_FILE } from '@platon/feature/compiler'
import { LATEST, ResourceTypes } from '@platon/feature/resource/common'
import {
  ResourceDependencyService,
  ResourceEntity,
  ResourceFileService,
  ResourceService,
} from '@platon/feature/resource/server'
import { Command, CommandRunner } from 'nest-commander'
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Repo } from 'libs/feature/resource/server/src/lib/files'

@Command({
  name: 'sync-exercises-dependencies',
  description: 'Synchronize exercises dependencies',
})
@Injectable()
export class SyncExercisesDependencies extends CommandRunner {
  private readonly logger = new Logger(SyncExercisesDependencies.name)
  constructor(
    private readonly resourceService: ResourceService,
    private readonly fileService: ResourceFileService,
    private readonly dependencyService: ResourceDependencyService
  ) {
    super()
  }

  public async run(): Promise<void> {
    // Seartch for all exercises that use a template
    this.logger.log('Searching for exercises to sync...')
    const [resources, nbResources] = await this.resourceService.search({
      types: [ResourceTypes.EXERCISE],
      useTemplate: true,
    })
    this.logger.log(`Found ${nbResources} exercises to sync...`)

    for (const resource of resources) {
      console.log('\n')

      // Get the resource repository
      this.logger.log(`Processing repo for resource: ${resource.id}`)
      const repo = (await this.fileService.repo(resource)).repo

      // Save the current branch
      const currentBranch = await repo.getCurrentBranch()

      // List all versions of the resource
      const versions = await repo.versions()
      this.logger.log(`Versions found: ${versions.all.length}`)

      for (const version of versions.all) {
        const tag = version.tag
        this.logger.log(`Processing version: ${tag}`)

        // Update the template dependency in database and get the new buffer
        const newBuffer = await this.updateTemplateDependency(resource, tag, repo)
        if (!newBuffer) {
          continue
        }

        try {
          // Checkout the version
          await repo.checkoutTag(tag)

          // Create a temporary branch to modify the file
          const tmpBranchName = `tmp-modif-${tag}`
          this.logger.log(`Creating branch ${tmpBranchName}...`)
          await repo.checkoutLocalBranch(tmpBranchName)

          // Write the new buffer to the file
          await repo.write(EXERCISE_MAIN_FILE, newBuffer)

          // Move the tag to the current commit
          await repo.moveTag(tag)

          // Checkout to the main branch
          await repo.checkout(currentBranch)

          // Delete the temporary branch
          await repo.deleteLocalBranch(tmpBranchName)
        } catch (e) {
          this.logger.error(`Error while processing version ${tag}`, e)
          continue
        }

        this.logger.log(`Version ${tag} processed.`)
      }

      this.logger.log(`Processing latest version...`)

      // Checkout to the main branch
      try {
        await repo.checkout(currentBranch)
      } catch (e) {
        this.logger.error(`Error while checking out to the main branch`, e)
      }

      const newBuffer = await this.updateTemplateDependency(resource, LATEST, repo)
      if (!newBuffer) {
        continue
      }

      // Write the new buffer to the file
      try {
        await repo.write(EXERCISE_MAIN_FILE, newBuffer)
      } catch (e) {
        this.logger.error(`Error while writing the file`, e)
      }

      this.logger.log(`Resource ${resource.id} processed.`)
    }
  }

  private async updateTemplateDependency(resource: ResourceEntity, tag: string, repo: Repo): Promise<Buffer | null> {
    // Get the template dependency from the database
    const templateDependency = await this.dependencyService.getTemplateDependency(resource.id, tag)

    // Get the file content
    const [file, buffer] = await repo.read(EXERCISE_MAIN_FILE, tag)
    if (!buffer) {
      this.logger.error(`File not found: ${EXERCISE_MAIN_FILE}`)
      return null
    }
    const bufferContent = Buffer.from((await buffer).buffer).toString()

    // If the file contains a line with "// @extends...", it means that the dependency is already created
    const lineWithComment = bufferContent
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('// @extends'))

    // Check if the file contains a line with "@extends"
    const firstLine = bufferContent
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('@extends'))

    if (templateDependency && (lineWithComment || !firstLine)) {
      this.logger.log(`Dependency already created for resource ${resource.id} version ${tag}`)
      return null
    }

    if (!firstLine) {
      this.logger.warn(`No line with "@extends" found in the file: ${EXERCISE_MAIN_FILE}`)
      this.logger.log(`Creating dependency for resource ${resource.id} version ${tag}`)
      await this.dependencyService.createDependencyForNewVersion(resource.id, tag)
      return null
    }

    // Get the template dependency from the file
    const tokens = firstLine
      .replace('@extends', '')
      .trim()
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    const [templateId, templateVersion] = tokens[0].split(':')

    if (
      templateDependency &&
      (templateDependency?.dependOnId !== templateId || templateDependency?.dependOnVersion !== templateVersion)
    ) {
      this.logger.warn(
        `Template dependency mismatch for resource ${resource.id} version ${tag}: expected ${templateId}:${templateVersion}, found ${templateDependency?.dependOnId}:${templateDependency?.dependOnVersion}`
      )
    }

    this.logger.log(
      `Updating template dependency for resource ${resource.id} version ${tag} to ${templateId}:${templateVersion}`
    )

    // Update the template dependency in the database
    try {
      await this.dependencyService.updateTemplateDependency({
        resourceId: resource.id,
        resourceVersion: tag,
        dependOnId: templateId,
        dependOnVersion: templateVersion,
        isTemplate: true,
      })
    } catch (e) {
      this.logger.error(`Error while updating template dependency`, e)
      return null
    }

    // Edit the file to comment the line with "@extends" and add a link to the documentation
    const lines = bufferContent.split('\n')
    const lineIndex = lines.findIndex((line) => line.trim() === firstLine)
    if (lineIndex !== -1) {
      lines[lineIndex] = `// ${lines[lineIndex]}`
      lines.splice(lineIndex + 1, 0, `// Le extends est inutile maintenant.`)
      lines.splice(lineIndex + 2, 0, `// On peut modifier le template dans les paramètres de la ressource.`)
      lines.splice(lineIndex + 3, 0, `// Voir la documentation : #docs/main/resources/exercises#changer-le-template`)
    }
    const newBufferContent = lines.join('\n')
    const newBuffer = Buffer.from(newBufferContent, 'utf-8')

    return newBuffer
  }
}
