import type { CommandInteraction, CreateApplicationCommandOptions } from 'oceanic.js'

export default interface Command {
  config: CreateApplicationCommandOptions
  handleCommand: (interaction: CommandInteraction) => Promise<void>
  id?: string
}
