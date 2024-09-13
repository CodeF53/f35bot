import type { CommandInteraction, CreateApplicationCommandOptions, File as DiscordFile, Message } from 'oceanic.js'
import { ApplicationCommandTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import _ from 'lodash'
import { scrapeTiktok } from '../mediaScraping/tiktok'
import { scrapeDLP } from '../mediaScraping/dlp'

export const config = {
  type: ApplicationCommandTypes.MESSAGE,
  name: 'Extract Media',
  integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
  contexts: _.values(_.pick(InteractionContextTypes, 'GUILD', 'BOT_DM', 'PRIVATE_CHANNEL')),
} satisfies CreateApplicationCommandOptions

export async function handleCommand(interaction: CommandInteraction): Promise<any> {
  const dataType = interaction.data.type
  if (dataType !== ApplicationCommandTypes.MESSAGE)
    throw new Error(`Expected MESSAGE but argument's type was ${ApplicationCommandTypes[dataType]}`)
  const message = interaction.data.target as Message

  const links = Array.from(message.content.matchAll(/https?:\/\/[^\]\s]*/g), match => match[0])
  if (links.length === 0)
    throw new Error('Selected message contains no links')

  interaction.defer()
  const files = await Promise.all(links.map((link) => {
    if (link.includes('tiktok.com'))
      return scrapeTiktok(link)

    // dlp has this weird behavior where it doesn't add file type to requested output for some sites
    if (link.includes('twitch.tv'))
      return scrapeDLP(link, '.mp4')

    return scrapeDLP(link)
  })).then(_.flatten).then(f => _.reject(f, _.isNil) as DiscordFile[])

  if (files.length > 0)
    return interaction.reply({ files })
  interaction.reply({ content: 'no media found' })
}
