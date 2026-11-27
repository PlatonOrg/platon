import { DiscoveryService } from '@golevelup/nestjs-discovery'
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpAdapterHost } from '@nestjs/core'
import { UserRoles } from '@platon/core/common'
import { AuthService, Configuration } from '@platon/core/server'
import { HttpRequestParameters, HttpResponse, IdToken, LaunchContext, Provider } from 'ltijs'
import { LmsUserEntity } from './entities/lms-user.entity'
import { LmsUserService } from './lms-user.service'
import { LTILaunchInterceptor, LTILaunchInterceptorArgs, LTI_LAUNCH_INTERCEPTOR } from './interceptor/lti-interceptor'
import { LtiDatabaseManager } from './lti-database.manager'
import { NestLtiHttpHandler } from './lti-http.handler'
import { buildBaseUsername, readCustomParam, resolveUserRole } from './lti-user.utils'
import { TEACHER_ROLES } from './provider/roles'

export const LTI_ROUTES = {
  login: '/lti/login',
  launch: '/lti/launch',
  keyset: '/lti/keys',
  dynamicRegistration: '/lti/register',
} as const

/**
 * Disabled during the LTI 1.1 -> 1.3 transition: a dynamically registered platform gets a random id
 * and would not be linked to the existing LTI 1.1 LMS (users would lose their account).
 * Platforms must be created from the admin UI by choosing the LMS to take over.
 */
export const LTI_DYNAMIC_REGISTRATION_ENABLED = false

@Injectable()
export class LtiService implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown {
  provider!: Provider

  private readonly logger = new Logger(LtiService.name)
  private readonly interceptors: LTILaunchInterceptor[] = []

  constructor(
    private readonly databaseManager: LtiDatabaseManager,
    private readonly config: ConfigService<Configuration>,
    private readonly lmsUserService: LmsUserService,
    private readonly authService: AuthService,
    private readonly discovery: DiscoveryService,
    private readonly adapterHost: HttpAdapterHost
  ) {}

  async onModuleInit(): Promise<void> {
    const providers = await this.discovery.providersWithMetaAtKey(LTI_LAUNCH_INTERCEPTOR)
    providers.forEach((provider) => {
      this.interceptors.push(provider.discoveredClass.instance as LTILaunchInterceptor)
    })

    // The Provider registers its routes when constructed: it must be created here, before Nest's 404 handler.
    this.provider = this.createProvider()
    this.provider.onResourceLink((context: LaunchContext, _request: HttpRequestParameters, response: HttpResponse) =>
      this.onResourceLink(context, response)
    )
  }

  async onApplicationBootstrap(): Promise<void> {
    // No `provider.listen()`: it would start the HTTP server (already handled by Nest) and
    // trap SIGINT to call `process.exit()`. Only the database needs to be checked.
    await this.databaseManager.listen()
  }

  async onApplicationShutdown(): Promise<void> {
    await this.provider?.close()
  }

  withLmsUser(idToken: IdToken, context?: LaunchContext): Promise<LmsUserEntity> {
    return this.lmsUserService.findOrCreate(
      { ltiPlatformId: idToken.platform.id, lmsUserId: idToken.user.id },
      resolveUserRole(idToken.user.roles, TEACHER_ROLES),
      async () => {
        const lmsUsername = await this.findLmsUsername(idToken, context)
        return {
          lmsUsername,
          baseUsername: buildBaseUsername(lmsUsername, idToken.user.givenName, idToken.user.familyName),
          user: {
            firstName: idToken.user.givenName ?? '',
            lastName: idToken.user.familyName ?? '',
            email: idToken.user.email ?? '',
          },
        }
      }
    )
  }

  private createProvider(): Provider {
    const serverUrl = (this.config.get<string>('server.url', { infer: true }) ?? '').replace(/\/$/, '')
    return new Provider({
      databaseManager: this.databaseManager,
      httpHandler: new NestLtiHttpHandler(this.adapterHost),
      dynamicRegistration: LTI_DYNAMIC_REGISTRATION_ENABLED
        ? {
            name: 'PLaTon',
            description:
              "PLaTon : plateforme d'apprentissage et d'évaluation avec exercices interactifs et correction automatique.",
            resourceLinkMessage: { label: 'PLaTon' },
            logo: `${serverUrl}/assets/images/logo/lti-logo.svg`,
            customParameters: { groups: '$Moodle.Person.userGroupIds', username: '$User.username' },
            useDeepLinking: false,
            url: serverUrl,
          }
        : undefined,
      routes: {
        loginRoute: LTI_ROUTES.login,
        launchRoute: LTI_ROUTES.launch,
        keysetRoute: LTI_ROUTES.keyset,
        dynamicRegistrationRoute: LTI_ROUTES.dynamicRegistration,
      },
      logger: this.logger,
    })
  }

  private async onResourceLink(context: LaunchContext, response: HttpResponse): Promise<void> {
    const { idToken } = context
    const custom = idToken.launch.custom

    const lmsUser = await this.withLmsUser(idToken, context)
    const token = await this.authService.authenticate(lmsUser.user.id, lmsUser.user.username)

    const args: LTILaunchInterceptorArgs = {
      lms: { id: idToken.platform.id, name: context.platform.name },
      lmsUser,
      payload: {
        ...idToken.launch.context,
        groups: readCustomParam(custom, 'groups'),
        custom_course: readCustomParam(custom, 'course'),
        custom_activity: readCustomParam(custom, 'activity'),
        is_instructor: resolveUserRole(idToken.user.roles, TEACHER_ROLES) === UserRoles.teacher,
      },
      nextUrl: this.toRelativeUrl(readCustomParam(custom, 'next')) ?? '/',
    }
    await Promise.all(this.interceptors.map((interceptor) => interceptor.intercept(args)))

    response.redirect(
      `/login?access-token=${token.accessToken}&refresh-token=${token.refreshToken}&next=${encodeURIComponent(
        args.nextUrl
      )}`
    )
  }

  /** Only accepts a path relative to PLaTon (`/courses/...`) to prevent any redirect to another site. */
  private toRelativeUrl(url?: string): string | undefined {
    return url?.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\') ? url : undefined
  }

  /**
   * User's login in the LMS: first the `username` custom parameter (`$User.username` in Moodle),
   * otherwise the Names and Roles service (`ext_user_username`). Undefined if neither is available.
   */
  private async findLmsUsername(idToken: IdToken, context?: LaunchContext): Promise<string | undefined> {
    const custom = readCustomParam(idToken.launch.custom, 'username')
    if (custom) return custom

    if (!context || !idToken.services.namesAndRoles.available) return undefined
    try {
      const { members } = await context.namesAndRoles.getMembers()
      const member = (members as readonly Record<string, unknown>[]).find((m) => m['userId'] === idToken.user.id)
      const username = member?.['ext_user_username']
      return typeof username === 'string' && username ? username : undefined
    } catch (error) {
      this.logger.warn(`Unable to fetch the username through Names and Roles: ${error}`)
      return undefined
    }
  }
}
