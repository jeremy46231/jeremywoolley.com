export async function onRequest(context) {
  if (!context.env.SLACK_TOKEN) {
    return new Response('Missing SLACK_TOKEN', { status: 500 })
  }
  const getJSON = async (url) =>
    await (
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${context.env.SLACK_TOKEN}`,
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
    // Commented out to keep status private (only show online/offline)
    // status_text: profile.profile.status_text,
    // status_emoji: profile.profile.status_emoji,
    // status_emoji_display_info: profile.profile.status_emoji_display_info,
    // huddle_state: profile.profile.huddle_state,
  }
  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' },
  })
}
