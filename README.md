# [jeremywoolley.com](https://jeremywoolley.com)

This is my personal site. It's static, with a couple API routes, running on a single Cloudflare Worker.

There is no build step and no minification. Static files in `src/` are served as-is so View Source shows exactly what I wrote.

## Development

`.dev.vars` needs these variables set:

- `LASTFM_KEY` - Last.fm API key for getting my music status
- `SLACK_TOKEN` - Slack bot API token for getting my Slack status (needs `users:read` and `users.profile:read` scopes)

Run `bunx wrangler dev` to start the local Worker dev server.

## Deploy

This project deploys with Wrangler from CI.

- GitHub Actions workflow: `.github/workflows/deploy-workers.yml`
- Manual deploy command: `bunx wrangler deploy`

### Required GitHub repository secrets

- `CLOUDFLARE_API_TOKEN` - API token with Workers deployment permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

### Required Worker secrets

Set these once for production:

- `bunx wrangler secret put LASTFM_KEY`
- `bunx wrangler secret put SLACK_TOKEN`
