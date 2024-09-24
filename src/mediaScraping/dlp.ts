import { readdir, unlink } from 'node:fs/promises'
import { file, hash } from 'bun'
import shell from '../util/shell'
import type { DiscordFile, StatusHandler } from '../@types/scraper'
import { bytesToMB } from './util'

export interface DLPOptions {
  url: string
  cliArgs?: string
  fileType?: string
}

const tempMediaDir = import.meta.dir.replace('src/mediaScraping', 'tempMedia/')

export async function scrapeDLP(opts: DLPOptions, updateStatus: StatusHandler = () => { }): Promise<[DiscordFile]> {
  console.log('scrapeDLP with opts', opts)

  updateStatus('validating link')
  // deny download if estimate is >25mb
  const mediaSize = await getMediaSize(opts)
  const mediaMB = bytesToMB(mediaSize)
  if (mediaSize > 25e+6)
    throw new Error(`${mediaMB} is too large to upload to discord (25mb max), try using <https://cobalt.tools>`)

  // download
  updateStatus(`downloading media (${mediaMB})`)
  let mediaPath = await downloadMedia(opts)

  // convert file if not supported format by discord
  if (/\.mkv$/.test(mediaPath)) {
    updateStatus(`transcoding media for discord playback`)
    mediaPath = await convertMedia(mediaPath)
  }

  // read file into buffer then yeet it
  updateStatus('reading downloaded media')
  const vid = await file(mediaPath).arrayBuffer().then(Buffer.from)
  unlink(mediaPath)

  return [{ name: mediaPath.replace(/^.*\//, ''), contents: vid }]
}

async function convertMedia(mediaPath: string): Promise<string> {
  const out = mediaPath.replace(/\.[^.]*$/, '.webm')
  await shell(`ffmpeg -i ${mediaPath} -c:v libvpx-vp9 -crf 30 -b:v 0 -b:a 128k -c:a libopus ${out}`)
    .finally(() => unlink(mediaPath))
  return out
}

// returns downloaded path
async function downloadMedia({ url, fileType = '', cliArgs = '' }: DLPOptions): Promise<string> {
  const fileHash = hash(url).toString()
  let fileName = `${tempMediaDir}${fileHash}${fileType}`

  await shell(`yt-dlp ${url} -o ${fileName} ${cliArgs}`)

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
  const mediaSizeCliArg = '-O "%(requested_formats.0.filesize+requested_formats.1.filesize)d"'

  const resp = shell(`yt-dlp '${url}' ${mediaSizeCliArg} ${cliArgs}`)
    .then(Number)
  if (Number.isNaN(resp)) return 0
  return resp
}
