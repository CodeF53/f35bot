// https://github.com/Vendicated/Vencord/tree/main/src/plugins/clearURLs
const encodedRules = ['action_object_map', 'action_type_map', 'action_ref_map', 'spm@*.aliexpress.com', 'scm@*.aliexpress.com', 'aff_platform', 'aff_trace_key', 'algo_expid@*.aliexpress.*', 'algo_pvid@*.aliexpress.*', 'btsid', 'ws_ab_test', 'pd_rd_*@amazon.*', '_encoding@amazon.*', 'psc@amazon.*', 'tag@amazon.*', 'ref_@amazon.*', 'pf_rd_*@amazon.*', 'pf@amazon.*', 'crid@amazon.*', 'keywords@amazon.*', 'sprefix@amazon.*', 'sr@amazon.*', 'ie@amazon.*', 'node@amazon.*', 'qid@amazon.*', 'callback@bilibili.com', 'cvid@bing.com', 'form@bing.com', 'sk@bing.com', 'sp@bing.com', 'sc@bing.com', 'qs@bing.com', 'pq@bing.com', 'sc_cid', 'mkt_tok', 'trk', 'trkCampaign', 'ga_*', 'gclid', 'gclsrc', 'hmb_campaign', 'hmb_medium', 'hmb_source', 'spReportId', 'spJobID', 'spUserID', 'spMailingID', 'itm_*', 's_cid', 'elqTrackId', 'elqTrack', 'assetType', 'assetId', 'recipientId', 'campaignId', 'siteId', 'mc_cid', 'mc_eid', 'pk_*', 'sc_campaign', 'sc_channel', 'sc_content', 'sc_medium', 'sc_outcome', 'sc_geo', 'sc_country', 'nr_email_referer', 'vero_conv', 'vero_id', 'yclid', '_openstat', 'mbid', 'cmpid', 'cid', 'c_id', 'campaign_id', 'Campaign', 'hash@ebay.*', 'fb_action_ids', 'fb_action_types', 'fb_ref', 'fb_source', 'fbclid', 'refsrc@facebook.com', 'hrc@facebook.com', 'gs_l', 'gs_lcp@google.*', 'ved@google.*', 'ei@google.*', 'sei@google.*', 'gws_rd@google.*', 'gs_gbg@google.*', 'gs_mss@google.*', 'gs_rn@google.*', '_hsenc', '_hsmi', '__hssc', '__hstc', 'hsCtaTracking', 'source@sourceforge.net', 'position@sourceforge.net', 't@*.twitter.com', 's@*.twitter.com', 'ref_*@*.twitter.com', 't@*.x.com', 's@*.x.com', 'ref_*@*.x.com', 't@*.fixupx.com', 's@*.fixupx.com', 'ref_*@*.fixupx.com', 't@*.fxtwitter.com', 's@*.fxtwitter.com', 'ref_*@*.fxtwitter.com', 't@*.twittpr.com', 's@*.twittpr.com', 'ref_*@*.twittpr.com', 't@*.fixvx.com', 's@*.fixvx.com', 'ref_*@*.fixvx.com', 'tt_medium', 'tt_content', 'lr@yandex.*', 'redircnt@yandex.*', 'feature@*.youtube.com', 'kw@*.youtube.com', 'si@*.youtube.com', 'pp@*.youtube.com', 'si@*.youtu.be', 'wt_zmc', 'utm_source', 'utm_content', 'utm_medium', 'utm_campaign', 'utm_term', 'si@open.spotify.com', 'igshid', 'igsh', 'share_id@reddit.com']

const universalRules = new Set<RegExp>()
const rulesByHost = new Map<string, Set<RegExp>>()
const hostRules = new Map<string, RegExp>()

function escapeRegExp(str: string) {
  const reRegExpChar = /[\\^$.*+?()[\]{}|]/g
  const reHasRegExpChar = new RegExp(reRegExpChar.source)
  return (str && reHasRegExpChar.test(str))
    ? str.replace(reRegExpChar, '\\$&')
    : (str || '')
}

for (const rule of encodedRules) {
  const [param, domain] = rule.split('@')
  const paramRule = new RegExp(`^${escapeRegExp(param).replace(/\\\*/, '.+?')}$`)

  if (!domain) {
    universalRules.add(paramRule)
    continue
  }

  const hostRule = new RegExp(`^(www\\.)?${escapeRegExp(domain)
    .replace(/\\\./, '\\.')
    .replace(/^\\\*\\\./, '(.+?\\.)?')
    .replace(/\\\*/, '.+?')
  }$`)
  const hostRuleIndex = hostRule.toString()

  hostRules.set(hostRuleIndex, hostRule)
  if (!rulesByHost.get(hostRuleIndex))
    rulesByHost.set(hostRuleIndex, new Set<RegExp>())
  rulesByHost.get(hostRuleIndex)!.add(paramRule)
}

function execRule(rule: RegExp, url: URL) {
  for (const [param] of url.searchParams) {
    if (rule.test(param)) url.searchParams.delete(param)
  }
}

export default function cleanURL(urlString: string) {
  let url: URL
  // don't modify anything if we can't parse the URL
  try {
    url = new URL(urlString) as URL
  } catch { return urlString }

  // Cheap way to check if there are any search params
  // If there are none, we don't need to modify anything
  if (url.searchParams.entries().next().done)
    return urlString

  // Check all universal rules
  for (const rule of universalRules)
    execRule(rule, url)

  // Check host rules
  for (const [hostRuleName, regex] of hostRules) {
    if (!regex.test(url.hostname)) continue
    for (const rule of rulesByHost.get(hostRuleName)!)
      execRule(rule, url)
  }

  return url.toString()
}
