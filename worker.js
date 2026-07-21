async function handleLastFM(env) {
  if (!env.LASTFM_KEY) {
    return new Response('Missing LASTFM_KEY', { status: 500 })
  }

  return fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=jeremy46231&api_key=${env.LASTFM_KEY}&format=json`
  )
}

async function proxyGitHub(env, url, cacheTtlSeconds) {
  const cache = caches.default
  const cacheKey = new Request(url)
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'jeremywoolley.com',
      Accept: 'application/vnd.github+json',
      ...(env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
        : {}),
    },
  })

  if (!response.ok) return response

  const cachedResponse = new Response(response.body, response)
  cachedResponse.headers.set(
    'Cache-Control',
    `public, max-age=${cacheTtlSeconds}`
  )
  await cache.put(cacheKey, cachedResponse.clone())
  return cachedResponse
}

async function handleGitHubEvents(env) {
  // Cached slightly longer than the client's 90s poll interval so many
  // concurrent visitors collapse into one upstream request, keeping us
  // well under GitHub's unauthenticated 60 req/hour per-IP rate limit.
  return proxyGitHub(
    env,
    'https://api.github.com/users/jeremy46231/events',
    90
  )
}

async function handleGitHubCommit(env, request) {
  const url = new URL(request.url)
  const repo = url.searchParams.get('repo')
  const sha = url.searchParams.get('sha')
  if (
    !repo ||
    !sha ||
    !/^[\w.-]+\/[\w.-]+$/.test(repo) ||
    !/^[0-9a-f]{7,40}$/i.test(sha)
  ) {
    return new Response('Invalid parameters', { status: 400 })
  }
  // Commits are immutable, so cache for a long time.
  return proxyGitHub(
    env,
    `https://api.github.com/repos/${repo}/commits/${sha}`,
    86400
  )
}

async function handleSlack(env) {
  if (!env.SLACK_TOKEN) {
    return new Response('Missing SLACK_TOKEN', { status: 500 })
  }

  const getJSON = async (url) =>
    await (
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${env.SLACK_TOKEN}`,
        },
      })
    ).json()

  const [profile, presence] = await Promise.all([
    getJSON('https://slack.com/api/users.profile.get?user=U06UYA5GMB5'),
    getJSON('https://slack.com/api/users.getPresence?user=U06UYA5GMB5'),
  ])

  if (!profile.ok || !presence.ok) {
    return new Response('Error fetching data', { status: 500 })
  }

  const response = {
    presence: presence.presence,
    status_text: profile.profile.status_text,
    status_emoji: profile.profile.status_emoji,
    status_emoji_display_info: profile.profile.status_emoji_display_info,
    huddle_state: profile.profile.huddle_state,
  }

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/api/lastfm') {
      return handleLastFM(env)
    }

    if (url.pathname === '/api/slack') {
      return handleSlack(env)
    }

    if (url.pathname === '/api/github/events') {
      return handleGitHubEvents(env)
    }

    if (url.pathname === '/api/github/commit') {
      return handleGitHubCommit(env, request)
    }

    return env.ASSETS.fetch(request)
  },
}
