import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { JwtHelperService } from '@auth0/angular-jwt'
import { AuthToken, ItemResponse } from '@platon/core/common'
import { firstValueFrom, lastValueFrom } from 'rxjs'
import { StorageService } from '../../services'
import { TokenProvider } from '../models/token-provider'

const KEY = 'auth-token'

/**
 * Handles JWT token generation/storage/refresh.
 */
@Injectable()
export class RemoteTokenProvider extends TokenProvider {
  private readonly http = inject(HttpClient)
  private readonly storage = inject(StorageService)

  tokenSync(): AuthToken | undefined {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null') as AuthToken
    } catch {
      return undefined
    }
  }

  /**
   * Gets the current auth token if it exists.
   * @returns A promise that resolves with an auth token or `undefined`.
   */
  token(): Promise<AuthToken | undefined> {
    return firstValueFrom(this.storage.get<AuthToken>(KEY))
  }

  /** Deletes the current auth token */
  remove(): Promise<void> {
    localStorage.removeItem(KEY)
    return firstValueFrom(this.storage.remove(KEY))
  }

  /**
   * Generates new auth token for the identified by `username`.
   *
   * Once the token is generared, it will be stored to the browser localStorage.
   * You must call `remove()` method to delete it.
   *
   * @param username An user name.
   * @param password An user password.
   * @returns A promise that resolves with an auth token.
   */
  async obtain(username: string, password: string): Promise<AuthToken> {
    const response = await lastValueFrom(
      this.http.post<ItemResponse<AuthToken>>('/api/v1/auth/signin/', {
        username,
        password,
      })
    )

    await firstValueFrom(this.storage.set(KEY, response.resource))
    localStorage.setItem(KEY, JSON.stringify(response.resource))

    return response.resource
  }

  /**
   * Refreshs the current auth token.
   *
   * The refresh token is only sent to the refresh endpoint. The server does not renew it (the session lasts
   * at most the refresh token lifetime from the sign-in), but the returned pair is stored as is so that
   * renewing it on the server side would not require any change here.
   *
   * @returns A promise that resolves with an auth token.
   */
  async refresh(): Promise<AuthToken> {
    const token = await this.token()
    if (!token) {
      throw new Error('auth/no-token')
    }

    const helper = new JwtHelperService()
    if (helper.isTokenExpired(token.refreshToken)) {
      await this.remove()
      throw new Error('auth/refresh-token-expired')
    }

    try {
      const response = await lastValueFrom(
        this.http.post<ItemResponse<AuthToken>>(
          '/api/v1/auth/refresh/',
          {},
          { headers: new HttpHeaders({ Authorization: `Bearer ${token.refreshToken}` }) }
        )
      )
      const refreshed: AuthToken = {
        accessToken: response.resource.accessToken,
        refreshToken: response.resource.refreshToken || token.refreshToken,
      }
      await this.save(refreshed)
      return refreshed
    } catch (error) {
      console.error('Unable to refresh token', error)
      // The server refused the refresh token: the session is over. Other errors (network, ...) may be temporary.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        await this.remove()
      }
      throw error
    }
  }

  async save(token: AuthToken) {
    await firstValueFrom(this.storage.set(KEY, token))
    localStorage.setItem(KEY, JSON.stringify(token))
  }
}
