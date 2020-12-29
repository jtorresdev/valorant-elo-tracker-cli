/* eslint-disable camelcase */
const axios = require('axios').default
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')

axiosCookieJarSupport(axios)

class Riot {
  constructor() {
    this.cookieJar = new tough.CookieJar()
  }

  async getAuthorization() {
    const response = await this.request(
      'POST',
      'https://auth.riotgames.com/api/v1/authorization',
      {
        client_id: 'play-valorant-web-prod',
        nonce: '1',
        redirect_uri: 'https://beta.playvalorant.com/opt_in',
        response_type: 'token id_token',
        scope: 'account openid',
      })

    return response
  }

  async login(username, password) {
    const response = await this.request(
      'PUT',
      'https://auth.riotgames.com/api/v1/authorization',
      {
        type: 'auth',
        username,
        password,
      })

    return response
  }

  async getEntitlements(access_token) {
    const response = await this.request(
      'POST',
      'https://entitlements.auth.riotgames.com/api/token/v1',
      {},
      {authorization: `Bearer ${access_token}`},
    )

    return response
  }

  async getUserInfo(access_token) {
    const response = await this.request(
      'POST',
      'https://auth.riotgames.com/userinfo',
      {},
      {authorization: `Bearer ${access_token}`}
    )

    return response
  }

  async getCareer(access_token, entitlements_token, region = 'na', player) {
    const response = await this.request(
      'GET',
      `https://pd.${region}.a.pvp.net/mmr/v1/players/${player}/competitiveupdates?startIndex=0&endIndex=20`,
      {},
      {
        authorization: `Bearer ${access_token}`,
        'X-Riot-Entitlements-JWT': entitlements_token,
      }
    )

    return response
  }

  async request(method, url, body = {}, headers = {}) {
    const {data} = await axios({
      url,
      jar: this.cookieJar,
      withCredentials: true,
      method,
      data: body,
      headers,
    })

    return data
  }
}

module.exports = Riot
