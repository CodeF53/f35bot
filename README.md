# f53util 
[![code style](https://antfu.me/badge-code-style.svg)](https://github.com/antfu/eslint-config) \
discord bot

# features:
- Extract Media
  - [x] rclick > "Extract Media"
  - [x] `/extract_media links: string`
- Transcribe
  - [ ] rclick > "Transcribe Message"
- Voice message any audio
  - [ ] rclick > "Send As Voice Message"
  - [ ] `/upload_voice file`

# usage
Install Needed Packages:
- [bun](https://bun.sh/) and run `bun install --frozen-lockfile`
- [ffmpeg](https://www.ffmpeg.org/download.html)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation)
- [yt-dlp-youtube-oauth2](https://github.com/coletdjnz/yt-dlp-youtube-oauth2?tab=readme-ov-file#installation) \
  make sure to login by doing `yt-dlp --username oauth2 --password '' https://youtu.be/...`

Install dependencies:
```bash
bun install
```

Run:
```bash
bun start
```
