import xbogus from 'xbogus'
import _ from 'lodash'
import type { DiscordFile, StatusHandler } from '../@types/scraper'
import { respToBuffer } from './util'

export async function scrapeTiktok(url: string, updateStatus: StatusHandler = () => { }): Promise<DiscordFile[]> {
  if (url.includes('/photo/'))
    return scrapeTiktokPhoto(/\/photo\/(\d+)/.exec(url)?.[1]!)

  updateStatus('getting tiktok info')
  const webResp = await fetch(url)
    .catch((r) => { throw new Error(`failed to fetch tiktok page ${r}`) })
  if (webResp.url.includes('/photo/'))
    return scrapeTiktokPhoto(/\/photo\/(\d+)/.exec(webResp.url)?.[1]!)

  const chainToken = webResp.headers.getSetCookie().find(cookie => cookie.startsWith('tt_chain_token'))!.split(';')[0]
  const body = await webResp.text()
    .catch((r) => { throw new Error(`failed to parse tiktok body ${r}`) })

  updateStatus('getting video link')
  const vidLink = JSON.parse(/playAddr":(".*?"),/.exec(body)?.[1] || 'null')
  if (!vidLink) throw new Error('no tiktok video link found')

  updateStatus('downloading video')
  const buffer = await fetch(vidLink, { headers: { Cookie: chainToken } })
    .then(respToBuffer)
    .catch((r) => { throw new Error(`tiktok video download failed ${r}`) })

  return [{ name: 'tiktok.mp4', contents: buffer }]
}

async function scrapeTiktokPhoto(itemId: string, updateStatus: StatusHandler = () => { }): Promise<DiscordFile[]> {
  updateStatus('getting image url(s)')
  // api needs all this data to respond but doesn't validate what is in there at all
  const dataPoints = 'meow mrrp colonThree nya mrao lessThanThree uwu owo'.split(' ')
  const neededData = ['WebIdLastTime', 'app_name', 'browser_language', 'browser_name', 'browser_platform', 'browser_version', 'os', 'device_id', 'device_platform', 'region', 'screen_height', 'screen_width']
    .map(item => `${item}=${_.sample(dataPoints)}`).join('&')

  const url = `https://www.tiktok.com/api/item/detail/?${neededData}`
    + '&aid=1988' + `&itemId=${itemId}` // very unsure about the hardcoded aid=1988 but it's worked so far
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'
  const postData: any = await fetch(`${url}&X-Bogus=${xbogus(url, userAgent)}`, { headers: { 'User-Agent': userAgent } })
    .then(resp => resp.json())
    .catch((r) => { throw new Error(`tiktok photo metadata fetch failed ${r}`) })

  const images: any[] = postData?.itemInfo?.itemStruct?.imagePost?.images
  if (!images || images.length === 0) throw new Error('no photos found in tiktok')

  updateStatus('downloading image(s)')
  const imageUrls: string[] = images.map(image => image?.imageURL?.urlList?.[0])
  const imageBuffers: Buffer[] = await Promise.all(imageUrls.map(url => fetch(url).then(respToBuffer)))
  return imageBuffers.map((buffer, i) => ({ name: `tikImg${i}.jpeg`, contents: buffer }))
}
