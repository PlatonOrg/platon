import { Injectable, Logger } from '@nestjs/common'
import { RagService } from '@platon/feature/ai/server'
import { Command, CommandRunner } from 'nest-commander'

@Command({
  name: 'rag-doc',
  description: 'Ingest documents for RAG (Retrieval-Augmented Generation)',
})
@Injectable()
export class RagDocCommand extends CommandRunner {
  private readonly logger = new Logger(RagDocCommand.name)

  constructor(private readonly ragService: RagService) {
    super()
  }

  public async run(): Promise<void> {
    this.logger.log('Starting RAG document ingestion...')

    try {
      const files = await this.ragService.getAllDocFiles('apps/docs/pages/')
      this.logger.log(`Found ${files.length} document(s) to process.`)

      for (const file of files) {
        await this.ragService.indexDocumentation(file)
        this.logger.log(`Indexed document: ${file}`)
      }
      this.logger.log('RAG document ingestion completed successfully.')
    } catch (error) {
      this.logger.error('Error during RAG document ingestion:', error)
      return
    }
  }
}
