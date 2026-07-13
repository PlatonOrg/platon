# @platon/core/testing/server

Shared testing utilities for NestJS/server-side tests.

## Features

- **Factories**: Create test entities with sensible defaults
  - `createUserEntity()` - Generate UserEntity test instances

- **Mocks**: Generic TypeORM mocks (coming soon)
  - `createMockRepository<T>()` - Mock TypeORM repositories
  - `createMockQueryBuilder()` - Mock query builders

## Usage

```typescript
import { createUserEntity } from '@platon/core/testing/server';

const user = createUserEntity({ role: UserRoles.admin });
```
