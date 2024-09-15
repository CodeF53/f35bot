import { ApplicationCommandOptionTypes, ApplicationCommandTypes, ApplicationIntegrationTypes, InteractionContextTypes } from 'oceanic.js'
import type { CommandInteraction, CreateApplicationCommandOptions, File as DiscordFile, Message } from 'oceanic.js'
import _ from 'lodash'
import cleanURL from '../util/cleanURL'
import { scrapeUrl } from '../mediaScraping'
import { bytesToMB } from '../mediaScraping/util'

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

  const urlStates: Dict<string | null> = _.zipObject(urls, Array.from(urls, () => 'Awaiting start'))

  let followUpId: string
  let attachments: string[] = []
  const uploadQueue: { files: DiscordFile[], url: string }[] = []
  function addFiles(files: DiscordFile[], url: string) {
    uploadQueue.push({ files, url })
    if (uploadQueue.length > 1) return
    addFilesFromQueue()
  }
  async function addFilesFromQueue() {
    const { files, url } = uploadQueue[0]
    updateStatus(url, `uploading ${files.length} files (${bytesToMB(_.sumBy(files, f => f.contents.byteLength))})`)

    const creationArguments = { files, attachments: Array.from(attachments, id => ({ id })) }
    let message
    if (!followUpId) message = await interaction.createFollowup(creationArguments).then(f => f.message)
    else message = await interaction.editFollowup(followUpId, creationArguments)
    followUpId = message.id
    attachments = message.attachments.map(({ id }) => id)

    updateStatus(url, null)
    uploadQueue.shift()
    if (uploadQueue.length > 0) addFilesFromQueue()
  }

  let statusMessageDeleted = false
  const updateStatusMessage = _.debounce(() => {
    const content = stringifyState(urlStates)
    if (content === '') {
      interaction.deleteOriginal()
      statusMessageDeleted = true
    }
    if (statusMessageDeleted) return
    interaction.editOriginal({ content })
  })
  function updateStatus(url?: string, state?: string | null) {
    if (url && state !== undefined) urlStates[url] = state
    updateStatusMessage()
  }

  await Promise.all(urls.map(async (url) => {
    const files = await scrapeUrl(url, status => updateStatus(url, status))
      .catch(e => updateStatus(url, e))
    if (!files) return
    updateStatus(url, `waiting to upload ${files.length} files (${bytesToMB(_.sumBy(files, f => f.contents.byteLength))})`)
    addFiles(files, url)
  }))

  updateStatusMessage()
}

function stringifyState(urlStates: Dict<string | null>) {
  let out = ''
  for (const url in urlStates) {
    if (!Object.prototype.hasOwnProperty.call(urlStates, url)) continue
    const state = urlStates[url]
    if (state === null) continue
    out += `\n\`${url.replace(/https?:\/\/(?:www\.)?/, '')}\`: ${state}`
  }
  return out
}
