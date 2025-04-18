export async function onRequest(context) {
  const getJSON = async (url) =>
    await (
      await fetch(url, {
        headers: {
          Authorization: `Bearer ${context.env.SLACK_TOKEN}`,
        },
      })
    ).json()
  
  const [profile, presence] = await Promise.all([
    getJSON(`https://slack.com/api/users.profile.get?user=${context.env.SLACK_USER_ID}`),
    getJSON(`https://slack.com/api/users.getPresence?user=${context.env.SLACK_USER_ID}`),
  ])
  if (!profile.ok || !presence.ok) {
    return new Response("Error fetching data", { status: 500 })
  }
  const response = {
    presence: presence.presence,
    status_text: profile.profile.status_text,
    status_emoji: profile.profile.status_emoji,
    status_emoji_display_info: profile.profile.status_emoji_display_info,
    huddle_state: profile.profile.huddle_state,
  }
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  })
  /*
  example
  {"presence":"active","status_text":"In a huddle","status_emoji":":headphones:","status_emoji_display_info":[{"emoji_name":"headphones","display_url":"https://a.slack-edge.com/production-standard-emoji-assets/14.0/apple-large/1f3a7.png","unicode":"1f3a7"}],"huddle_state":"default_unset"}
  3 kinds of status: presence, custom status, huddle status
  presence may also be "away", huddle_state may also be "in_a_huddle"
  the emoji may not have a unicode codepoint, but if it does, String.fromCodePoint(parseInt(emoji, 16)) will work
  the custom status takes priority over the huddle status, and the huddle status renders like the ":headphones: In a huddle" above
  */
}
