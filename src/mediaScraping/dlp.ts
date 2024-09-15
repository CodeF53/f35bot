import { readdir, unlink } from 'node:fs/promises'
import type { File as DiscordFile } from 'oceanic.js'
import { $, file, hash } from 'bun'

export interface DLPOptions {
  url: string
  cliArgs?: string
  fileType?: string
}

const tempMediaDir = import.meta.dir.replace('src/mediaScraping', 'tempMedia/')

export async function scrapeDLP(opts: DLPOptions): Promise<[DiscordFile] | undefined> {
  // deny download if estimate is >20mb
  const mediaSize = await getMediaSize(opts)
  if (mediaSize > 2e+7) throw new Error('Media too large to upload to discord, use <https://cobalt.tools>')

  const mediaPath = await downloadMedia(opts)

  // TODO: convert file if not supported format by discord

  // read file into buffer then yeet it
  const vid = await file(mediaPath).arrayBuffer().then(Buffer.from)
  unlink(mediaPath)

  return [{ name: mediaPath.replace(/^.*\//, ''), contents: vid }]
}

// returns downloaded path
async function downloadMedia({ url, fileType = '', cliArgs = '' }: DLPOptions): Promise<string> {
  const fileHash = hash(url).toString()
  let fileName = `${tempMediaDir}${fileHash}${fileType}`

  // run DLP in command line, see https://bun.sh/docs/runtime/shell
  await $`yt-dlp ${url} -o ${fileName} ${cliArgs}`.text()
    .catch((e) => { throw new Error(e.stderr) })

  // find file's type if we don't know it
  if (!fileType) {
    fileName += await readdir(tempMediaDir)
      .then(files => files.find(f => f.includes(fileHash))!)
      .then(fileName => fileName.replace(fileHash, ''))
  }
  return fileName
}

/** returns size of media without downloading (in bytes) */
async function getMediaSize({ url, cliArgs = '' }: DLPOptions): Promise<number> {
  // https://github.com/yt-dlp/yt-dlp/issues/947#issuecomment-917366922
  const resp = await $`yt-dlp ${url} -O "%(requested_formats.0.filesize+requested_formats.1.filesize)d" ${cliArgs}`.text()
    .catch((e) => { throw e.stderr }) // catch what is likely an `ERROR: Unsupported URL:`
    .then(Number) // cast string to number
  if (Number.isNaN(resp)) return 0
  return resp
}
