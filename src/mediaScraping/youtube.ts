import type { DiscordFile, StatusHandler } from '../@types/scraper'
import shell from '../util/shell'
import { scrapeDLP } from './dlp'

let knownGoodAuth = false

export default async function scrapeYoutube(url: string, updateStatus: StatusHandler = () => { }): Promise<DiscordFile[]> {
  if (!knownGoodAuth) {
    console.log('checking youtube auth state')
    updateStatus('checking youtube auth state')
    const noAuth = await shell('yt-dlp RCAvHiagMBM --simulate --username oauth2 --password \'\' & sleep 5; kill $!', { log: false, throwError: false })
      .then(text => text.includes('To give yt-dlp access to your account, go to'))
    if (noAuth)
      throw new Error('Youtube scraper not logged in or request timed out, yell at @f53')
    knownGoodAuth = true
  }

  return scrapeDLP({ url, cliArgs: '--username oauth2 --password \'\'' }, updateStatus)
}
