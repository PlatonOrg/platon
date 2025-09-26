import { Injectable } from '@nestjs/common'
import { googleAI } from '@genkit-ai/googleai'
import { Genkit } from 'genkit'
import { openAI } from '@genkit-ai/compat-oai/openai'
import { GenkitService } from './genkit.service'
import { AiTool } from '@platon/feature/ai/common'
import { RagService } from './RAG/rag.service'

@Injectable()
export class AiService {
  private readonly ai: Genkit = GenkitService.getInstance()

  constructor(private readonly ragService: RagService) {}
  async generateTool(prompt: string): Promise<AiTool> {
    const response = (
      await this.ai.generate({
        model: googleAI.model('gemini-1.5-flash-8b', {
          temperature: 0.2,
          topP: 0.1,
          topK: 32,
        }),
        prompt: prompt,
        system: `Tu es PLaTon AI. Ta mission est de catégoriser chaque demande utilisateur en **un seul mot** : "doc", "create" ou "other".
      Contexte :
      La plateforme PLaTon permet aux enseignants de créer, gérer et corriger des exercices pour leurs étudiants.
      La documentation couvre uniquement :
      - la création et la gestion d'exercices dans PLaTon,
      - les modules disponibles,
      - les fonctionnalités de suivi et de correction,
      - l'utilisation générale de la plateforme.

      Définitions des catégories :
      - "doc" : la demande concerne spécifiquement le fonctionnement ou l'utilisation de la plateforme PLaTon.
        → Exemples : "Comment créer un exercice dans PLaTon ?", "Quels sont les modules disponibles ?", "Comment fonctionne la correction automatique ?"

      - "create" : la demande demande explicitement à l'IA de générer un exercice pédagogique, la demande doit explicitement exprimer un domaine pédagogique  (les maths, les langues, quelque chose).
        → Exemples : "Crée un exercice de math sur les équations", "Génère un quiz d'histoire de 10 questions"

      - "other" :
        1. toute demande en dehors du périmètre de la plateforme PLaTon,
        2. toute demande trop vague ou trop générale,
        3. toute situation où il n'est pas clair si la demande correspond à "doc" ou "create".
        Dans le doute, tu dois toujours choisir "other".

      Tu dois répondre **uniquement** par "doc", "create" ou "other".
      Aucune phrase, explication ou autre format n'est autorisé.
      `,
      })
    ).text.trim()
    return response as AiTool
  }

  async *generate(prompt: string, tool: AiTool = AiTool.OTHER, system?: string): AsyncGenerator<string> {
    switch (tool) {
      case AiTool.DOCUMENTATION:
        yield* this.ragService.generate(prompt)
        break
      default: {
        const response = this.ai.generateStream({
          model: openAI.model('RedHatAI/Llama-3.3-70B-Instruct-FP8-dynamic'),
          prompt: prompt,
          system: system,
        })
        for await (const chunk of response.stream) {
          yield chunk.text
        }
        break
      }
    }
  }
}
