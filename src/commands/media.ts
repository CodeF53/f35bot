import type { CommandInteraction, CreateApplicationCommandOptions, InteractionContent, Message } from 'oceanic.js'
import { ApplicationCommandTypes, ApplicationIntegrationTypes, InteractionContextTypes, MessageFlags } from 'oceanic.js'
import _ from 'lodash'
import { scrapeMany } from '../mediaScraping'
import cleanURL from '../util/cleanURL'

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

  const urls = _.uniq(Array.from(message.content.matchAll(/(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g), match => cleanURL(match[0])))
  if (urls.length === 0) throw new Error('Selected message contains no urls')

  interaction.editOriginal({ content: `scraping media from ${urls.length} links` })
  const { files, errors, successfulURLs } = await scrapeMany(urls)

  const replyArgs: InteractionContent = { files }
  replyArgs.content = successfulURLs.map(url => `<${url}>`).join(' ')

  if (files.length === 0) {
    replyArgs.content += `**No Media Found!**\n`
    replyArgs.flags = MessageFlags.EPHEMERAL
  }
  if (errors.length > 0) {
    const multiple = errors.length > 1

    replyArgs.content += `**Error${multiple ? 's' : ''} while getting media:**\n`
    for (const e of errors) {
      const shortUrl = cleanURL(e.url).replace(/^https?:\/\/(?:www\.)?/, '')
      replyArgs.content += `- \`${shortUrl}\`: \`${e.error.toString().trim()}\`\n`
    }
  }

  if (files.length > 1)
    await interaction.editOriginal({ content: 'uploading media' })
  await interaction.createFollowup(replyArgs)
  interaction.deleteOriginal()
}
