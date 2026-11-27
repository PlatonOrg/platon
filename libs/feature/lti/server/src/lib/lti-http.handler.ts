import { Logger } from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import type { Express, Request, Response } from 'express'
import { HttpError, HttpMethod, LtijsError } from 'ltijs'
import type { HttpHandler, HttpRequestParameters, HttpResponse, RouteHandler } from 'ltijs'

const EXPRESS_METHODS: Record<HttpMethod, 'get' | 'post' | 'put' | 'delete' | 'all'> = {
  [HttpMethod.Get]: 'get',
  [HttpMethod.Post]: 'post',
  [HttpMethod.Put]: 'put',
  [HttpMethod.Delete]: 'delete',
  [HttpMethod.All]: 'all',
}

/**
 * ltijs `HttpHandler` that registers the LTI 1.3 routes directly on the NestJS Express application:
 * no second HTTP server and no dedicated port.
 *
 * Routes must be registered before Nest adds its 404 handler (`registerRouterHooks`),
 * i.e. in `onModuleInit` at the latest. Request bodies are already parsed by Nest (json + urlencoded).
 */
export class NestLtiHttpHandler implements HttpHandler {
  private readonly logger = new Logger(NestLtiHttpHandler.name)

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  registerRoute(path: string, methods: HttpMethod[], handler: RouteHandler): void {
    const app = this.adapterHost.httpAdapter?.getInstance<Express>()
    if (!app) {
      this.logger.warn(`No Nest HTTP server available, LTI route skipped: ${path}`)
      return
    }
    for (const method of methods) {
      app[EXPRESS_METHODS[method]](path, (req: Request, res: Response) => this.handle(handler, req, res))
    }
  }

  /** The HTTP server lifecycle belongs to Nest. */
  async listen(): Promise<void> {
    return
  }

  async close(): Promise<void> {
    return
  }

  private async handle(handler: RouteHandler, req: Request, res: Response): Promise<void> {
    const response = this.toResponse(res)
    try {
      const request: HttpRequestParameters = {
        method: req.method,
        path: req.path,
        query: req.query as HttpRequestParameters['query'],
        body: req.body ?? {},
        headers: req.headers as HttpRequestParameters['headers'],
      }
      await handler(request, response)
    } catch (error) {
      // Same error -> status mapping as the ExpressHttpHandler shipped with ltijs
      const { name, message, stack, status } = (error ?? {}) as Error & { status?: number }
      if (error instanceof LtijsError) {
        this.logger.error(message)
        response.status(400).json({ error: name, message })
      } else if (error instanceof HttpError) {
        this.logger.error(message)
        response.status(status ?? 502).json({ error: name, message, external: true })
      } else {
        this.logger.error(stack ?? message ?? String(error))
        response.status(500).json({ error: 'INTERNAL_SERVER_ERROR' })
      }
    }
  }

  private toResponse(res: Response): HttpResponse {
    const response: HttpResponse = {
      status: (code: number) => {
        res.status(code)
        return response
      },
      redirect: (url: string) => res.redirect(url),
      html: (content: string) => {
        res.type('html').send(content)
      },
      json: (body: unknown) => {
        res.json(body)
      },
    }
    return response
  }
}
