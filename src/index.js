/* eslint-disable no-restricted-modules */
/* eslint-disable node/no-unpublished-require */
const Riot = require('./lib/riot')
const { Command, flags } = require('@oclif/command')
const inquirer = require('inquirer')
const cli = require('cli-ux').default
const accountsJSON = require('../accounts.json')
const constants = require('../constants.json')
const Table = require('cli-table3')
const XDate = require('xdate')
const colors = require('colors')

class ValorantEloTrackerCommand extends Command {
  async run() {
    const riot = new Riot()
    const getCookies = await riot.getAuthorization()

    if (!getCookies.country) this.log('Error al obtener cookies')

    const { accounts } = accountsJSON

    let selected

    if (accounts.length > 1) {
      selected = await inquirer
        .prompt([
          {
            type: 'list',
            message: 'select account:',
            name: 'username',
            choices: accounts.map(({ username }) => ({ name: username })),
          },
        ])
    } else {
      selected = accounts[0]
    }


    this.log('')

    cli.action.start('logging in')

    const { username, password, region } = accounts.find(account => account.username === selected.username)

    const login = await riot.login(username, password)

    if (!login.response) this.log('Error al iniciar sesión')

    cli.action.stop('connected')
    cli.action.start('getting recent matches')

    const { response: { parameters: { uri } } } = login

    const accessToken = uri.match(/access_token=(.+?)&scope=/)[1]

    const { entitlements_token: entitlementsToken } = await riot.getEntitlements(accessToken)

    if (!entitlementsToken) this.log('Error al obtener entitlements')

    const user = await riot.getUserInfo(accessToken)

    if (!user.sub) this.log('Error al obtener usuario')

    const career = await riot.getCareer(accessToken, entitlementsToken, region, user.sub)

    if (!career.Matches) this.log('Error al obtener historial de partidas')

    cli.action.stop('done')

    const { Matches } = career

    const { maps, ranks } = constants

    var table = new Table({
      head: ['date', 'map', 'rank', 'points'],
      colWidths: [20, 10, 10],
      style: {
        head: [],
        border: [],
      },
    })

    let currentRP = 0
    let currentRank = 0

    const filterMatches = Matches
      .filter(({ CompetitiveMovement }) => CompetitiveMovement !== 'MOVEMENT_UNKNOWN')
      .splice(0, 10)

    const [lastMatch] = filterMatches

    currentRP = lastMatch.TierProgressAfterUpdate
    currentRank = lastMatch.TierAfterUpdate

    filterMatches.forEach(({
      MapID,
      TierAfterUpdate,
      TierBeforeUpdate,
      TierProgressAfterUpdate,
      MatchStartTime,
      CompetitiveMovement,
      TierProgressBeforeUpdate }) => {
      const date = new XDate(MatchStartTime).toString('dd/MM/yyyy HH:mm')

      const nochange = TierProgressAfterUpdate === TierProgressBeforeUpdate

      const promoted = CompetitiveMovement === 'PROMOTED'

      const incrase = (TierProgressAfterUpdate > TierProgressBeforeUpdate) || promoted

      const demoted = CompetitiveMovement === 'DEMOTED'

      const tier = ranks[Math.max(TierAfterUpdate, TierBeforeUpdate)]

      const map = maps[MapID]

      const arrow = promoted ? '▲' : demoted ? '▼' : ''

      const points = promoted ? 100 - TierProgressBeforeUpdate + TierProgressAfterUpdate : TierProgressAfterUpdate - TierProgressBeforeUpdate

      const elo = colors[nochange ? 'white' : incrase ? 'green' : 'red'](`${incrase ? '+' : ''}${points} ${arrow}`)

      table.push([date, map, tier, elo])
    })

    this.log('')

    this.log(`${colors.magenta.bold('Game tag:')} ${user.acct.game_name}#${user.acct.tag_line}`)
    this.log(`${colors.magenta.bold('Rank:')} ${ranks[currentRank]}`)
    this.log(`${colors.magenta.bold('RP:')} ${currentRP}`)
    this.log(`${colors.magenta.bold('ELO:')} ${(currentRank * 100) - 300 + currentRP}`)

    this.log('')

    this.log(`${colors.magenta.bold('Recent matches:')}`)
    this.log(table.toString())
  }
}

ValorantEloTrackerCommand.description = `Describe the command here
...
Extra documentation goes here
`

ValorantEloTrackerCommand.flags = {
  // add --version flag to show CLI version
  version: flags.version({ char: 'v' }),
  // add --help flag to show CLI version
  help: flags.help({ char: 'h' }),
  name: flags.string({ char: 'n', description: 'name to print' }),
}

module.exports = ValorantEloTrackerCommand
