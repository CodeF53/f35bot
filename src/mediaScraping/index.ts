import type { File as DiscordFile } from 'oceanic.js'
import { scrapeTiktok } from './tiktok'
import { scrapeDLP } from './dlp'

const includesAny = (str: string, candidates: string[]) => candidates.some(c => c.includes(str))

export async function scrapeUrl(url: string, updateStatus: (status: string) => void = () => { }): Promise<DiscordFile[]> {
  // Tiktok gets it's own scraper implementation because:
  //   1. dlp doesn't get all the images found in a multi-image post
  //   2. it was fun to implement
  if (url.includes('tiktok.com'))
    return scrapeTiktok(url)

  if (url.includes('twitch.tv')) {
    // ignore twitch vods
    if (url.includes('videos')) throw new Error('Twitch VODs aren\'t supported')
    // dlp doesn't add filetype for twitch outputs so add it manually
    return scrapeDLP({ url, fileType: '.mp4' }, updateStatus)
  }

  // youtube needs oauth2 on remote server because it can't get cookies from browser
  if (includesAny(url, ['youtu.be', 'youtube.com/watch']))
    return scrapeDLP({ url, cliArgs: '--username oauth2 --password \'\'' }, updateStatus)

  // fallback on default DLP
  return scrapeDLP({ url }, updateStatus)
}
