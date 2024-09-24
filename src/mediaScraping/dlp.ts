import { readdir, unlink } from 'node:fs/promises'
import type { File as DiscordFile } from 'oceanic.js'
import { $, file, hash } from 'bun'
import { bytesToMB } from './util'

export interface DLPOptions {
  url: string
  cliArgs?: string
  fileType?: string
}

const tempMediaDir = import.meta.dir.replace('src/mediaScraping', 'tempMedia/')

export async function scrapeDLP(opts: DLPOptions, updateStatus: (status: string) => void = () => { }): Promise<[DiscordFile]> {
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
  await $`ffmpeg -i ${mediaPath} -c:v libvpx-vp9 -crf 30 -b:v 0 -b:a 128k -c:a libopus ${out}`.text()
    .catch((e) => { throw new Error(e.stderr) })
    .finally(() => unlink(mediaPath))
  return out
}

// returns downloaded path
async function downloadMedia({ url, fileType = '', cliArgs = '' }: DLPOptions): Promise<string> {
  const fileHash = hash(url).toString()
  let fileName = `${tempMediaDir}${fileHash}${fileType}`

  // run DLP in command line, see https://bun.sh/docs/runtime/shell
  const command = `yt-dlp ${url} -o ${fileName} ${cliArgs}`
  console.log('running [download]', command)
  await $`${command}`.text()
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
  const command = `yt-dlp '${url}' -O "%(requested_formats.0.filesize+requested_formats.1.filesize)d" ${cliArgs}`
  console.log('running [sizeCheck]', command)
  // https://github.com/yt-dlp/yt-dlp/issues/947#issuecomment-917366922
  const resp = await $`${command}`.text()
    .catch((e) => { throw e.stderr }) // catch what is likely an `ERROR: Unsupported URL:`
    .then(Number) // cast string to number
  if (Number.isNaN(resp)) return 0
  return resp
}
