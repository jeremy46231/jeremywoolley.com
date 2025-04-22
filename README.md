# [jeremywoolley.com](https://jeremywoolley.com)

This is my personal site! It's static, with the addition of a few API routes, running on Cloudflare Pages. There's no build step, so the View Source button allows you to see the exact code that I typed, unminified.

## Development

`.dev.vars` needs these variables set:

- `LASTFM_KEY` - Last.fm API key for getting my music status
- `SLACK_TOKEN` - Slack bot API token for getting my Slack status (needs `users:read` and `users.profile:read` scopes)

Run `npx wrangler pages dev src` to start the dev server. Push to the repo to deploy, change config in the Cloudflare dashboard.
