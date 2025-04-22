export async function onRequest(context) {
  if (!context.env.LASTFM_KEY) {
    return new Response('Missing LASTFM_KEY', { status: 500 })
  }
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=jeremy46231&api_key=${context.env.LASTFM_KEY}&format=json`
  )
  return response
}
