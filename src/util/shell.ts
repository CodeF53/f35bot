import { spawn } from 'node:child_process'

export default async function (command: string, options: { log?: boolean, throwError?: boolean } = {}) {
  options = { log: true, throwError: true, ...options }

  let out = ''
  let error = ''
  if (options.log) console.log('Running Shell Command', command)
  const process = spawn(command, { shell: true })

  process.stdout.on('data', (textBuffer) => {
    out += textBuffer
    if (options.log) console.log(`${textBuffer}`.trim().replace(/^/gm, 'log > '))
  })
  process.stderr.on('data', (textBuffer) => {
    error += textBuffer
    if (options.log) console.error(`${textBuffer}`.trim().replace(/^/gm, 'err > '))
  })
  await new Promise(r => process.on('close', r))

  if (process.exitCode !== 0 && options.throwError)
    throw new Error(error)

  return out
}
