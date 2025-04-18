async function updateSlack() {
  const slackElement = document.getElementById('slack')
  const slackStatusElement = document.getElementById('slack-status')

  try {
    const slackData = await (await fetch('/api/slack')).json()

    let statusText = ''
    let statusEmojiHTML = ''

    const customEmojiInfo = slackData.status_emoji_display_info?.[0]
    if (slackData.status_emoji) {
      if (customEmojiInfo?.unicode) {
        statusEmojiHTML = String.fromCodePoint(
          parseInt(customEmojiInfo.unicode, 16)
        )
      } else if (customEmojiInfo?.display_url) {
        statusEmojiHTML = `<img src="${customEmojiInfo.display_url}" alt="${slackData.status_emoji}" style="display: inline; height: 1em; width: 1em; vertical-align: -0.1em;">`
      } else {
        statusEmojiHTML = slackData.status_emoji
      }
    } else if (slackData.huddle_state === 'in_a_huddle') {
      statusEmojiHTML = '🎧'
    } else if (slackData.presence === 'active') {
      statusEmojiHTML = '🟢'
    } else {
      statusEmojiHTML = '⚪️'
    }

    if (slackData.status_text) {
      statusText = slackData.status_text
    } else if (slackData.huddle_state === 'in_a_huddle') {
      statusText = 'In a huddle'
    } else {
      statusText = slackData.presence === 'active' ? 'Active' : 'Away'
    }

    console.log('Slack status:', statusText)

    slackStatusElement.innerHTML = `${statusEmojiHTML} ${statusText}`
    slackElement.classList.remove('loading')
    slackElement.classList.remove('error')
  } catch (e) {
    slackElement.classList.remove('loading')
    slackElement.classList.add('error')
    slackStatusElement.textContent = 'Error loading Slack status'
    console.error('Error updating Slack status:', e)
  }
}

async function updateLastFM() {
  const lastFMElement = document.getElementById('lastfm')
  const lastFMStatusElement = document.getElementById('lastfm-status')

  try {
    const recentTracks = (await (await fetch('/api/lastfm')).json())
      .recenttracks.track
    const nowPlaying = recentTracks.find(
      (song) => song?.['@attr']?.nowplaying === 'true'
    )
    if (nowPlaying) {
      const link = document.createElement('a')
      link.href = 'https://www.last.fm/user/jeremy46231' // nowPlaying.url
      link.target = '_blank'
      link.textContent = `${nowPlaying.name} by ${
        nowPlaying.artist['#text'].split('; ')[0]
      }`
      lastFMStatusElement.textContent = 'Now playing: '
      lastFMStatusElement.append(link)
    } else {
      const lastTrack = recentTracks[0]
      const date = Temporal.Instant.fromEpochMilliseconds(
        lastTrack.date.uts * 1000
      )
      const duration = Temporal.Now.instant().since(date)
      const durationString = formatDuration(
        duration,
        date.toZonedDateTimeISO(Temporal.Now.timeZoneId())
      )
      const link = document.createElement('a')
      link.href = 'https://www.last.fm/user/jeremy46231' // lastTrack.url
      link.target = '_blank'
      link.textContent = `${lastTrack.name} by ${
        lastTrack.artist['#text'].split('; ')[0]
      }`
      lastFMStatusElement.textContent = ''
      lastFMStatusElement.append(link)
      lastFMStatusElement.append(` (${durationString} ago)`)
    }
    console.log('Last.fm status:', lastFMStatusElement.innerText)

    lastFMElement.classList.remove('loading')
  } catch (e) {
    lastFMElement.classList.remove('loading')
    lastFMElement.classList.add('error')
    lastFMStatusElement.textContent = 'Error loading last.fm data'
    console.error('Error updating last.fm status:', e)
  }
}

async function updateGitHub() {
  const githubElement = document.getElementById('github')
  const githubStatusElement = document.getElementById('github-status')

  try {
    const events = await (
      await fetch('https://api.github.com/users/jeremy46231/events')
    ).json()

    const latestPush = Array.isArray(events)
      ? events.find(
          (event) =>
            event.type === 'PushEvent' && event.actor.login === 'jeremy46231'
        )
      : null

    if (
      latestPush &&
      latestPush.payload &&
      latestPush.payload.commits &&
      latestPush.payload.commits.length > 0
    ) {
      const repo = latestPush.repo.name
      const lastCommit =
        latestPush.payload.commits[latestPush.payload.commits.length - 1]
      const hash = lastCommit.sha.substring(0, 7)
      const link = `https://github.com/${repo}/commit/${lastCommit.sha}`
      const message = lastCommit.message.split('\n')[0].slice(0, 50) // Limit to 50 characters
      const date = Temporal.Instant.from(latestPush.created_at)
      const duration = Temporal.Now.instant().since(date)
      const durationString = formatDuration(
        duration,
        date.toZonedDateTimeISO(Temporal.Now.timeZoneId())
      )

      githubStatusElement.textContent = ''
      const linkElement = document.createElement('a')
      linkElement.href = link
      linkElement.target = '_blank'

      const commitIDElement = document.createElement('code')
      commitIDElement.textContent = hash
      linkElement.append(commitIDElement)

      githubStatusElement.append(linkElement)
      githubStatusElement.append(`: "${message}" (${durationString} ago)`)

      console.log('GitHub status:', githubStatusElement.innerText)
    } else {
      throw new Error('No recent push events found')
    }

    githubElement.classList.remove('loading')
    githubElement.classList.remove('error')
  } catch (e) {
    githubElement.classList.remove('loading')
    githubElement.classList.add('error')
    // Keep the icon, but update text
    githubStatusElement.textContent = 'Error loading GitHub status'
    console.error('Error updating GitHub status:', e)
  }
}

// Main loop

while (true) {
  while (document.visibilityState !== 'visible') {
    await sleep(500)
  }
  await Promise.all([updateSlack(), updateLastFM(), updateGitHub()])
  console.log('Updated statuses')
  await sleep(30_000)
}

// Helper functions

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDuration(duration, relativeTo) {
  const roundSettings =
    Temporal.Duration.compare(duration, { days: 3 }, { relativeTo }) === 1
      ? { smallestUnit: 'days' }
      : Temporal.Duration.compare(duration, { minutes: 5 }, { relativeTo }) === 1
      ? { largestUnit: 'hours', smallestUnit: 'minutes' }
      : { largestUnit: 'minutes', smallestUnit: 'seconds' }
  const rounded = duration.round(roundSettings, { relativeTo })
  const string = rounded.toLocaleString('en', { style: 'long' })
  return string
}
