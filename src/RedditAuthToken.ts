import { Date_, Throw, Time } from '@aelesia/commons'
import Http, { OAuth2Token } from 'httyp'

type Token = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

type GrantAuthorizationCode = {
  client_id: string
  client_secret: string
  code: string
  redirect_uri: string
}

export class RedditAuthToken extends OAuth2Token {
  cfg: GrantAuthorizationCode
  tkn: Token & { expires_on: Date } = undefined as any

  constructor(config: GrantAuthorizationCode) {
    super({} as any)
    this.cfg = config
  }

  async init(): Promise<void> {
    await this.refresh_token()
  }

  // FIXME: Shouldn't be void function
  async refresh_token(): Promise<void> {
    try {
      let data = (
        await Http.url('https://www.reddit.com/api/v1/access_token')
          .auth_basic(this.cfg.client_id, this.cfg.client_secret)
          .body_forms({
            grant_type: 'authorization_code',
            code: this.cfg.code,
            redirect_uri: this.cfg.redirect_uri
          })
          .post<Token>()
      ).data

      if (!data.access_token || !data.token_type || !data.expires_in) {
        throw Error(`Invalid token - ${JSON.stringify(data)}`)
      }

      this.tkn = { ...data, ...{ expires_on: Date_.add(data.expires_in * 1000) } }
      console.log('this.tkn', this.tkn)
    } catch (e) {
      const err = e instanceof Error ? e : undefined
      Throw(new Error('Unable to obtain O2A token'), err)
    }
  }

  async async_access_token(): Promise<string> {
    if (!this.tkn) {
      console.log('No token')
      await this.refresh_token()
    } else if (Date_.isPast(this.tkn.expires_on)) {
      console.log('Token expired')
      await this.refresh_token()
    } else if (Time.until(this.tkn.expires_on) < Time.mins(1)) {
      console.log('Token expiring soon')
      this.refresh_token()
        .then(() => {})
        .catch(() => {})
    }
    return this.tkn.access_token
  }
}
