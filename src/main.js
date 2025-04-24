const ageElement = document.getElementById('age')
const yearElement = document.getElementById('year')
const clockElement = document.getElementById('clock')
const clockTimeElement = document.getElementById('clock-time')
const slackElement = document.getElementById('slack')
const slackStatusElement = document.getElementById('slack-status')
const lastFMElement = document.getElementById('lastfm')
const lastFMStatusElement = document.getElementById('lastfm-status')
const githubElement = document.getElementById('github')
const githubStatusElement = document.getElementById('github-status')

// Update my age if needed
const birthday = Temporal.ZonedDateTime.from(
  '2008-11-14T00:00-08[America/Los_Angeles]'
)
const age = Temporal.Now.instant().since(birthday).round({
  largestUnit: 'years',
  relativeTo: birthday,
  roundingMode: 'trunc',
}).years
// const article =
//   age.toFixed()[0] === '8' || age === 11 || age === 18 ? 'an' : 'a'
ageElement.textContent = age

// Update the copyright year if needed
// I don't think this is how the legal system works, but it makes my website look more up-to-date ;)
yearElement.innerText = Temporal.Now.plainDateISO().year

function updateClock() {
  try {
    const now = Temporal.Now.zonedDateTimeISO('America/Los_Angeles')
    const localDate = Temporal.Now.plainDateISO()
    const emoji = plainTimeToEmoji(now.toPlainTime())
    const timeString = now.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    const dateDifference = localDate.until(now.toPlainDate()).days
    const dateDifferenceString =
      dateDifference > 0
        ? ' (tomorrow)'
        : dateDifference < 0
        ? ' (yesterday)'
        : ''

    clockTimeElement.textContent = `${emoji} ${timeString} Pacific${dateDifferenceString}`
  } catch (e) {
    console.error('Error updating clock:', e)
    if (window.stopStatusUpdate) return
    clockTimeElement.textContent = 'Error displaying time'
  }

  clockElement.classList.remove('loading')
}

async function updateSlack() {
  try {
    const slackData = await (await fetch('/api/slack')).json()
    if (window.stopStatusUpdate) return

    let statusText = ''
    /** @type {null | string | Element} */
    let statusEmoji = null

    const customEmojiInfo = slackData.status_emoji_display_info?.[0]
    if (
      slackData.status_emoji &&
      slackData.status_emoji !== ':tw_musical_note:'
    ) {
      if (customEmojiInfo?.unicode) {
        statusEmoji = String.fromCodePoint(
          parseInt(customEmojiInfo.unicode, 16)
        )
      } else if (customEmojiInfo?.display_url) {
        const img = document.createElement('img')
        img.src = customEmojiInfo.display_url
        img.alt = slackData.status_emoji
        img.style.display = 'inline'
        img.style.height = '1em'
        img.style.width = '1em'
        img.style.verticalAlign = '-0.1em'
        statusEmoji = img
      } else {
        statusEmoji = slackData.status_emoji
      }
    } else if (slackData.huddle_state === 'in_a_huddle') {
      statusEmoji = '🎧'
    } else if (slackData.presence === 'active') {
      statusEmoji = '🟢'
    } else {
      statusEmoji = '⚪️'
    }

    if (
      slackData.status_text &&
      slackData.status_emoji !== ':tw_musical_note:'
    ) {
      statusText = slackData.status_text
    } else if (slackData.huddle_state === 'in_a_huddle') {
      statusText = 'In a huddle'
    } else {
      statusText = slackData.presence === 'active' ? 'Active' : 'Away'
    }

    console.log('Slack status:', statusText)

    slackStatusElement.textContent = ''
    slackStatusElement.append(statusEmoji)
    slackStatusElement.append(` ${statusText}`)
    slackElement.classList.remove('loading')
    slackElement.classList.remove('error')
  } catch (e) {
    console.error('Error updating Slack status:', e)
    if (window.stopStatusUpdate) return
    slackElement.classList.remove('loading')
    slackElement.classList.add('error')
    slackStatusElement.textContent = '⚪️ Error loading Slack status'
  }
}

async function updateLastFM() {
  try {
    const recentTracks = (await (await fetch('/api/lastfm')).json())
      .recenttracks.track
    if (window.stopStatusUpdate) return
    const nowPlaying = recentTracks.find(
      (song) => song?.['@attr']?.nowplaying === 'true'
    )
    if (nowPlaying) {
      const link = document.createElement('a')
      link.href = 'https://www.last.fm/user/jeremy46231' // nowPlaying.url
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
    console.error('Error updating last.fm status:', e)
    if (window.stopStatusUpdate) return
    lastFMElement.classList.remove('loading')
    lastFMElement.classList.add('error')
    lastFMStatusElement.textContent = 'Error loading last.fm data'
  }
}

async function updateGitHub() {
  try {
    const events = await (
      await fetch('https://api.github.com/users/jeremy46231/events')
    ).json()
    if (window.stopStatusUpdate) return

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
      let message = lastCommit.message.split('\n')[0].slice(0, 101) // Limit to 100 characters
      if (message.length > 100) message[100] = '…'
      const date = Temporal.Instant.from(latestPush.created_at)
      const duration = Temporal.Now.instant().since(date)
      const durationString = formatDuration(
        duration,
        date.toZonedDateTimeISO(Temporal.Now.timeZoneId())
      )

      githubStatusElement.textContent = ''
      const linkElement = document.createElement('a')
      linkElement.href = link

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
    console.error('Error updating GitHub status:', e)
    if (window.stopStatusUpdate) return
    githubElement.classList.remove('loading')
    githubElement.classList.add('error')
    // Keep the icon, but update text
    githubStatusElement.textContent = 'Error loading GitHub status'
  }
}

window.stopStatusUpdate = false
;(async () => {
  while (true) {
    if (window.stopStatusUpdate) break
    updateClock()
    const msLeftInSecond =
      1000 - (Temporal.Now.instant().epochMilliseconds % 1000)
    await sleep(msLeftInSecond) // Update every second (aligned with clock)
  }
})()
;(async () => {
  while (true) {
    while (document.visibilityState !== 'visible') await sleep(500)
    if (window.stopStatusUpdate) break
    await Promise.all([updateSlack(), updateLastFM()])
    await sleep(30_000)
  }
})()
;(async () => {
  while (true) {
    while (document.visibilityState !== 'visible') await sleep(500)
    if (window.stopStatusUpdate) break
    await updateGitHub()
    await sleep(90_000)
  }
})()

// Helper functions

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatDuration(duration, relativeTo) {
  const roundSettings =
    Temporal.Duration.compare(duration, { days: 3 }, { relativeTo }) === 1
      ? { smallestUnit: 'days' }
      : Temporal.Duration.compare(duration, { minutes: 5 }, { relativeTo }) ===
        1
      ? { largestUnit: 'hours', smallestUnit: 'minutes' }
      : { largestUnit: 'minutes', smallestUnit: 'seconds' }
  const rounded = duration.round(roundSettings, { relativeTo })
  const string = rounded.toLocaleString('en', { style: 'long' })
  return string
}

function plainTimeToEmoji(time) {
  const rounded = time.round({ smallestUnit: 'minutes', roundingIncrement: 30 })
  const hour = rounded.hour % 12
  const is30Minutes = rounded.minute === 30

  const hourEmojis = '🕛,🕐,🕑,🕒,🕓,🕔,🕕,🕖,🕗,🕘,🕙,🕚'.split(',')
  const halfHourEmojis = '🕧,🕜,🕝,🕞,🕟,🕠,🕡,🕢,🕣,🕤,🕥,🕦'.split(',')

  const hourEmoji = is30Minutes ? halfHourEmojis[hour] : hourEmojis[hour]

  return hourEmoji
}
