import googleAI from '@genkit-ai/googleai'
import { Injectable } from '@nestjs/common'
import { z } from 'genkit'
import postgres from 'postgres'
import { toSql } from 'pgvector/utils'
import { Document } from 'genkit'
import * as fs from 'fs/promises'
import * as path from 'path'
import { chunk } from 'llm-chunk'
import { DocumentationEntity } from './documentation.entity'
import { Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { GenkitService } from '../genkit.service'

@Injectable()
export class RagService {
  private readonly embedder = GenkitService.getInstance()

  private readonly chunkingConfig = {
    minLength: 1000,
    maxLength: 2000,
    splitter: 'sentence' as const,
    overlap: 100,
    delimiters: '',
  }

  private readonly indexOutputSchema = z.object({
    indexedCount: z.number(),
    success: z.boolean(),
    error: z.string().optional(),
  })

  private readonly indexFlowInvoker
  private readonly retrievalQAFlowInvoker

  constructor(
    @InjectRepository(DocumentationEntity)
    private readonly repository: Repository<DocumentationEntity>
  ) {
    this.indexFlowInvoker = this.defineIndexDocFlow()
    this.defineRetriever()
    this.retrievalQAFlowInvoker = this.defineRetrievalQAFlow()
  }

  private defineIndexDocFlow() {
    return this.embedder.defineFlow(
      {
        name: 'indexDocumentation',
        inputSchema: z.object({ docPath: z.string() }),
        outputSchema: this.indexOutputSchema,
      },
      async ({ docPath }: { docPath: string }) => {
        try {
          const documents = await this.processFile(docPath)

          const entities = []
          for (const doc of documents) {
            const startTime = Date.now()
            const embedding = (
              await this.embedder.embed({
                embedder: googleAI.embedder('gemini-embedding-001', { outputDimensionality: 1536 }),
                content: doc.text,
              })
            )[0].embedding
            const apiTime = Date.now()
            // Ensure we don't exceed 1 request per second to avoid rate limiting
            // (Google Gemini rate limit is 100 requests per minute)
            // to ensure at least 1 second between calls
            const time = apiTime - startTime
            const waitTime = Math.max(0, 1000 - time)

            if (waitTime > 0) {
              await new Promise((resolve) => setTimeout(resolve, waitTime))
            }
            entities.push(
              this.repository.create({
                content: doc.text,
                embedding,
                metadata: doc.metadata,
              })
            )
          }
          await this.repository.save(entities)

          return { success: true, indexedCount: documents.length }
        } catch (error) {
          return { success: false, indexedCount: 0, error: String(error) }
        }
      }
    )
  }

  private defineRetriever() {
    const sql = postgres({
      ssl: false,
      database: process.env['POSTGRES_DB'],
      host: process.env['POSTGRES_HOST'],
      username: process.env['POSTGRES_USER'],
      password: process.env['POSTGRES_PASSWORD'],
    })
    this.embedder.defineRetriever(
      {
        name: 'pgvector-myTable',
      },
      async (input) => {
        const embedding = (
          await this.embedder.embed({
            embedder: googleAI.embedder('gemini-embedding-001', { outputDimensionality: 1536 }),
            content: input,
          })
        )[0].embedding
        const results = await sql`
        SELECT *
        FROM "Documentation"
        ORDER BY embedding <#> ${toSql(embedding)} LIMIT 12
      `
        return {
          documents: results.map((row) => {
            const { content, ...metadata } = row
            return Document.fromText(content, metadata)
          }),
        }
      }
    )
  }

  private defineRetrievalQAFlow() {
    return this.embedder.defineFlow(
      {
        name: 'retrievalQA',
        inputSchema: z.object({ question: z.string() }),
      },
      async ({ question }: { question: string }) => {
        // Récupérer les documents pertinents
        const retrievalResult = await this.embedder.retrieve({
          retriever: 'pgvector-myTable',
          query: question,
        })

        const context = retrievalResult.map((doc) => doc.text).join('\n\n')
        const sources = retrievalResult.forEach((doc) =>
          console.debug(JSON.stringify(doc.metadata?.['metadata']?.source, null, 2))
        )

        console.debug('RAG Sources:', sources)

        // Retourner le stream directement
        return this.embedder.generateStream({
          model: googleAI.model('gemini-2.5-flash'),
          prompt: `You are an AI assistant that helps people find information. Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Always respond in the same language as the question.
        If the question included the name of a webcomponent, mainly use the documentation from wc-"name of the component"

        Context:
        ${context}

        Question: ${question}
        Answer:`,
        })
      }
    )
  }

  async processFile(filePath: string): Promise<Document[]> {
    const absPath = path.resolve(filePath)
    const raw = await fs.readFile(absPath, 'utf-8')
    const cleanTxt = RagService.cleanMarkdown(raw)

    const chunks = chunk(cleanTxt, this.chunkingConfig)

    return chunks.map((text, i) => Document.fromText(text, { source: filePath, chunkIndex: i }))
  }

  private static cleanMarkdown(md: string): string {
    return md
      .replace(/import\s.*from\s.*;/g, '')
      .replace(/<Callout.*?>([\s\S]*?)<\/Callout>/g, '$1')
      .replace(/<[^>]+>/g, '') // retire JSX/HTML
      .trim()
  }

  async getAllDocFiles(dir: string): Promise<string[]> {
    let results: string[] = []
    const list = await fs.readdir(dir, { withFileTypes: true })
    for (const file of list) {
      const filePath = path.join(dir, file.name)
      if (file.isDirectory()) {
        results = results.concat(await this.getAllDocFiles(filePath))
      } else if ((file.name.endsWith('.md') || file.name.endsWith('.mdx')) && !file.name.startsWith('_')) {
        results.push(filePath)
      }
    }
    return results
  }

  async indexDocumentation(filePath: string): Promise<void> {
    const result = await this.indexFlowInvoker({ docPath: filePath })
    if (!result.success) {
      throw new Error(`Failed to index document ${filePath}: ${result.error}`)
    }
  }

  async *generate(prompt: string): AsyncGenerator<string> {
    try {
      const responseStream = await this.retrievalQAFlowInvoker({ question: prompt })
      for await (const chunk of responseStream.stream) {
        if (chunk.text) {
          yield chunk.text
        }
      }
    } catch (error) {
      console.error('❌ RAG Service error:', error)
      yield `Erreur lors de la recherche dans la documentation: ${error}`
    }
  }
}
