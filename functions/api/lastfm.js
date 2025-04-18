export async function onRequest(context) {
  const response = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=jeremy46231&api_key=${context.env.LASTFM_KEY}&format=json`
  )
  return response
}
