import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ApplicationIntegrationTypes, InteractionContextTypes, MessageFlags } from 'oceanic.js'
import type { CommandInteraction, CreateApplicationCommandOptions, InteractionContent, Message } from 'oceanic.js'
import _ from 'lodash'
import { scrapeMany } from '../mediaScraping'
import cleanURL from '../util/cleanURL'

const baseConfig = {
  integrationTypes: [ApplicationIntegrationTypes.USER_INSTALL],
  contexts: _.values(_.pick(InteractionContextTypes, 'GUILD', 'BOT_DM', 'PRIVATE_CHANNEL')),
}

export const configs = [
  {
    ...baseConfig,
    type: ApplicationCommandTypes.MESSAGE,
    name: 'Extract Media',
  },
  {
    ...baseConfig,
    type: ApplicationCommandTypes.CHAT_INPUT,
    name: 'extract_media',
    description: 'upload Media from Youtube/Twitter/Instagram/TikTok/Reddit directly to Discord',
    options: [{
      type: ApplicationCommandOptionTypes.STRING,
      required: true,
      name: 'links',
      description: 'link or links to extract media from',
    }],
  },
] satisfies CreateApplicationCommandOptions[]

export async function handleCommand(interaction: CommandInteraction): Promise<any> {
  const dataType = interaction.data.type
  const input = (() => {
    switch (dataType) {
      case ApplicationCommandTypes.MESSAGE:
        return (interaction.data.target as Message).content
      case ApplicationCommandTypes.CHAT_INPUT:
        return interaction.data.options.getString('links', true)
      default:
        throw new Error(`Expected MESSAGE but argument's type was ${ApplicationCommandTypes[dataType]}`)
    }
  })()

  const urls = _.uniq(Array.from(input.matchAll(/(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g), match => cleanURL(match[0])))
  if (urls.length === 0) throw new Error('Selected message contains no urls')

  interaction.editOriginal({ content: `scraping media from ${urls.length} links` })
  const { files, errors, successfulURLs } = await scrapeMany(urls)

  const followUpArgs: InteractionContent = { files }
  followUpArgs.content = `${successfulURLs.map(url => `<${url}>`).join(' ')}\n`

  if (files.length >= 1) {
    const mediaSizeMb = Math.round(_.sumBy(files, file => file.contents.byteLength) * 1e-6)
    await interaction.editOriginal({ content: `uploading media ${mediaSizeMb}mb` })
  } else {
    followUpArgs.content += `**No Media Found!**\n`
    followUpArgs.flags = MessageFlags.EPHEMERAL
  }
  if (errors.length > 0) {
    const multiple = errors.length > 1
    for (const e of errors) {
      const shortUrl = cleanURL(e.url).replace(/^https?:\/\/(?:www\.)?/, '')
      followUpArgs.content += `${multiple ? '- ' : ''}\`${shortUrl}\`: \`${e.error.toString().trim()}\`\n`
    }
  }

  if (files.length > 1) {
    const mediaSizeMb = _.sumBy(files, file => file.contents.byteLength) * 1e-6
    await interaction.editOriginal({ content: `uploading media ${mediaSizeMb}mb` })
  }
  await interaction.createFollowup(followUpArgs)
  interaction.deleteOriginal()
}
