import { unlink } from 'node:fs/promises'
import type { File as DiscordFile } from 'oceanic.js'
import { $, file, hash } from 'bun'

export async function scrapeDLP(url: string, fileType?: string): Promise<DiscordFile | undefined> {
  // TODO: return undefined if dlp doesn't support

  // TODO: deny download if estimate is >20mb https://github.com/yt-dlp/yt-dlp/issues/947#issuecomment-917366922

  // download shit with dlp -- weird filename nonsense because sometimes dlp adds filename and sometimes it doesn't
  let fileName = hash(url).toString()
  if (fileType) fileName += fileType
  const dlpResp = await $`yt-dlp '${url}' -o ${fileName}`.text()
    .catch((e) => { throw new Error(e.stderr) })
  if (!fileType) {
    fileType = getFileTypeFromDLPResp(dlpResp)
    fileName += fileType
  }

  // TODO: convert file if not supported format by discord

  const vid = await file(fileName).arrayBuffer().then(Buffer.from)
  unlink(fileName)

  return { name: fileName, contents: vid }
}

function getFileTypeFromDLPResp(resp: string): string {
  // eslint-disable-next-line regexp/no-unused-capturing-group
  const fileType = /Merging formats into .*(\.[^.]+)"|Deleting original file .+(\.[^.]+) \(/.exec(resp)?.[1]
  if (!fileType) throw new Error('Failed to get media filetype')
  return fileType
}
