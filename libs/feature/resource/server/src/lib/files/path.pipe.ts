import { Injectable, PipeTransform } from '@nestjs/common'

// Nest forwards `{*path}` wildcard route params as a string array, so this normalizes it back into a single path.
@Injectable()
export class JoinPathPipe implements PipeTransform<string | string[] | undefined, string> {
  transform(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value.join('/') : value || ''
  }
}
