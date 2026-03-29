# [jeremywoolley.com](https://jeremywoolley.com)

This is my personal site. It's static, with a couple API routes, running on a single Cloudflare Worker.

There is no build step and no minification. Static files in `src/` are served as-is so View Source shows exactly what I wrote.

## Development

`.dev.vars` needs these variables set:

- `LASTFM_KEY` - Last.fm API key for getting my music status
- `SLACK_TOKEN` - Slack bot API token for getting my Slack status (needs `users:read` and `users.profile:read` scopes)

Run `bunx wrangler dev` to start the local Worker dev server.

## Deploy

Run:

`bun run deploy`

Production secrets (set once):

- `bunx wrangler secret put LASTFM_KEY`
- `bunx wrangler secret put SLACK_TOKEN`
