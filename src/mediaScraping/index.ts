import type { File as DiscordFile } from 'oceanic.js'
import { scrapeTiktok } from './tiktok'
import { scrapeDLP } from './dlp'

export async function scrapeMany(urls: string[]): Promise<{ files: DiscordFile[], successfulURLs: string[], errors: { url: string, error: any }[] }> {
  const files: DiscordFile[] = []
  const errors: { url: string, error: any }[] = []
  const successfulURLs: string[] = []

  await Promise.all(urls.map(async (url) => {
    const urlFiles = await scrapeUrl(url)
      .catch((error) => { errors.push({ url, error }) })
    if (!urlFiles || urlFiles.length === 0) return
    files.push(...urlFiles)
    successfulURLs.push(url)
  }))

  return { files, errors, successfulURLs }
}

const includesAny = (str: string, candidates: string[]) => candidates.some(c => c.includes(str))

async function scrapeUrl(url: string): Promise<DiscordFile[] | undefined> {
  // Tiktok gets it's own scraper implementation because:
  //   1. dlp doesn't get all the images found in a multi-image post
  //   2. it was fun to implement
  if (url.includes('tiktok.com'))
    return scrapeTiktok(url)

  if (url.includes('twitch.tv')) {
    // ignore twitch vods
    if (url.includes('videos')) return
    // dlp doesn't add filetype for twitch outputs so add it manually
    return scrapeDLP({ url, fileType: '.mp4' })
  }

  // youtube needs oauth2 on remote server because it can't get cookies from browser
  if (includesAny(url, ['youtu.be', 'youtube.com/watch']))
    return scrapeDLP({ url, cliArgs: '--username oauth2 --password \'\'' })

  // fallback on default DLP
  return scrapeDLP({ url })
}
