import { readdir } from 'node:fs/promises'
import { Client, InteractionTypes, MessageFlags } from 'oceanic.js'
import _ from 'lodash'
import type Command from './@types/command'

const testEnv = Boolean(process.env.TEST)
const client = new Client({ auth: `Bot ${process.env.TOKEN}` })
client.on('error', err => console.error(`Oceanic Client Error`, err))
await client.connect()
await new Promise<void>(r => client.on('ready', r))

// get commands to register
const commandDir = `${import.meta.dir}/commands`
const commandFiles = await readdir(commandDir)
  .then(files => files.filter(f => f.endsWith('.ts')))
  .then(files => Promise.all(files.map(f => import(`${commandDir}/${f}`))))
// split files into multiple commands
const commands: Command[] = commandFiles.flatMap(file =>
  file.configs.map((config: any) => ({ ...file, config: {
    ...config,
    name: testEnv ? `test_${config.name}` : config.name,
  } })))

// register commands & get their ids
const registeredCommands = await client.application.bulkEditGlobalCommands(_.map(commands, 'config'))
for (let i = 0; i < registeredCommands.length; i++)
  commands[i].id = registeredCommands[i].id

// handle interactions
client.on('interactionCreate', (interaction) => {
  if (interaction.type !== InteractionTypes.APPLICATION_COMMAND) return

  const command = _.find(commands, { id: interaction.data.id })
  if (!command) return interaction.reply({ content: 'Failed to find command for interaction', flags: MessageFlags.EPHEMERAL })

  interaction.defer(MessageFlags.EPHEMERAL)
  command.handleCommand(interaction)
    .catch(r => interaction.editOriginal({ content: `${r}` }))
})
