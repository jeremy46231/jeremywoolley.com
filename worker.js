async function handleLastFM(env) {
  if (!env.LASTFM_KEY) {
    return new Response('Missing LASTFM_KEY', { status: 500 })
  }

  return fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=jeremy46231&api_key=${env.LASTFM_KEY}&format=json`
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

    return env.ASSETS.fetch(request)
  },
}
