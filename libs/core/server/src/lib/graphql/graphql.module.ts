/* eslint-disable @typescript-eslint/no-explicit-any */

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql'
import { join } from 'path'
import { DateScalar } from './scalars/date.scalar'
import { UUID } from './scalars/uuid.scalar'

export function mapKeysToLowerCase(inputObject: Record<string, any>): Record<string, any> {
  let key
  const keys = Object.keys(inputObject)
  let n = keys.length
  const newobj: Record<string, any> = {}
  while (n--) {
    key = keys[n]
    newobj[key.toLowerCase()] = inputObject[key]
  }
  return newobj
}

@Module({
  imports: [
    // https://docs.nestjs.com/graphql/quick-start
    // https://wanago.io/2021/02/15/api-nestjs-real-time-graphql-subscriptions/
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: Boolean(process.env.GRAPHQL_PLAYGROUND),
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      resolvers: {
        UUID,
      },
      // https://docs.nestjs.com/graphql/subscriptions#enable-subscriptions-with-apollo-driver
      // installSubscriptionHandlers: true,

      // https://github.com/nestjs/docs.nestjs.com/issues/394#issuecomment-582161405
      subscriptions: {
        'subscriptions-transport-ws': {
          onConnect: (connectionParams: any) => {
            const headers = mapKeysToLowerCase(connectionParams)
            return {
              req: {
                headers,
              },
            }
          },
        },
      },
      useGlobalPrefix: true,
      // pass the original req and res object into the graphql context,
      // get context with decorator `@Context() { req, res, payload, connection }: GqlContext`
      // req, res used in http/query&mutations, connection used in webSockets/subscriptions
      context: ({ req, res, payload, connection }: any) => ({ req, res, payload, connection }),
    }),
  ],
  providers: [ConfigService, DateScalar],
  exports: [NestGraphQLModule],
})
export class GraphQLModule {}
