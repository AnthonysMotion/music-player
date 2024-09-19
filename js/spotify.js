const clientId = '1bb93e0197cd43eda134cc008e1d05cd';
const redirectUri = 'http://127.0.0.1:5500';
const scopes = 'streaming user-read-email user-read-private user-top-read user-modify-playback-state user-read-playback-state user-read-recently-played';

let accessToken = '';
let player = null;
let deviceId = '';
let pausedTrack = null;
let pausedPosition = 0;
let lastPlayedTrack = null;

// maintain a local queue
let queue = [];

// get access token from link
function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

function redirectToSpotifyLogin() {
    const authUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location = authUrl;
}

// clear access token and show login page
function handleLogout() {
    localStorage.removeItem('spotifyAccessToken');
    accessToken = '';
    document.getElementById('login').style.display = 'block';
    document.getElementById('player').style.display = 'none';
}

// start spotify playback
window.onSpotifyWebPlaybackSDKReady = () => {
    if (typeof Spotify === 'undefined') return;

    player = new Spotify.Player({
        name: 'anth keez web player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
    });

    player.addListener('player_state_changed', (state) => {
        if (state) {
            const currentTrack = state.track_window.current_track;
            document.getElementById('track-name').textContent = currentTrack.name;
            document.getElementById('track-artist').textContent = currentTrack.artists.map(artist => artist.name).join(', ');
            document.getElementById('track-album').textContent = currentTrack.album.name;
            document.getElementById('track-duration').textContent = formatDuration(state.duration);
            document.getElementById('track-image').src = currentTrack.album.images[0].url;
        }
    });

    player.connect();
};

// play a song
function playTrack(trackUri, positionMs = 0) {
    if (!deviceId) return;

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [trackUri] }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => {
        if (response.ok && positionMs > 0) {
            setTimeout(() => {
                fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
            }, 100);
        }
    });
}

// get user's last played song
function fetchLastPlayedTrack() {
    if (!accessToken) return;

    fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
        .then(data => {
            if (data.items.length > 0) {
                const lastPlayedItem = data.items[0].track;
                lastPlayedTrack = lastPlayedItem.uri;
                pausedPosition = new Date(data.items[0].played_at).getTime();
            }
        });
}

// pause the song
function pauseTrack() {
    if (!deviceId) return;

    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => {
        if (response.ok) {
            fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }).then(response => response.json())
                .then(data => {
                    if (data && data.item) {
                        pausedTrack = data.item;
                        pausedPosition = data.progress_ms;
                    }
                });
        }
    });
}

// format duration from milliseconds to minutes:seconds
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${(seconds < 10 ? '0' : '')}${seconds}`;
}

function addToQueue(trackUri, trackName, trackArtist) {
    if (!deviceId || !accessToken) return;

    // add track to the local queue
    queue.push({ uri: trackUri, name: trackName, artist: trackArtist });
    updateQueueList();

    // add to Spotify queue
    fetch(`https://api.spotify.com/v1/me/player/queue?uri=${trackUri}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => {
        if (response.ok) {
            console.log('Track added to queue successfully');
        } else {
            console.error('Failed to add track to queue');
        }
    });
}

function updateQueueList() {
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';

    if (queue.length > 0) {
        queue.forEach(track => {
            const trackItem = document.createElement('li');
            trackItem.textContent = `${track.name} by ${track.artist}`;
            queueList.appendChild(trackItem);
        });
    } else {
        queueList.innerHTML = '<li>No tracks in the queue</li>';
    }
}

// search for a song and display results
function searchSongs(query) {
    if (!accessToken) return;

    fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
        .then(data => {
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = '';

            if (data.tracks.items.length > 0) {
                data.tracks.items.forEach(track => {
                    const trackElement = document.createElement('div');
                    trackElement.classList.add('track-item');
                    trackElement.innerHTML = `
                        <img src="${track.album.images[0].url}" alt="${track.name}" width="50">
                        <span>${track.name} - ${track.artists.map(artist => artist.name).join(', ')}</span>
                        <button class="play-track" data-uri="${track.uri}">Play</button>
                        <button class="add-to-queue" data-uri="${track.uri}" data-name="${track.name}" data-artist="${track.artists.map(artist => artist.name).join(', ')}">Add</button>
                    `;
                    resultsContainer.appendChild(trackElement);
                });

                document.querySelectorAll('.play-track').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const trackUri = event.target.getAttribute('data-uri');
                        playTrack(trackUri, pausedPosition);
                    });
                });

                document.querySelectorAll('.add-to-queue').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const trackUri = event.target.getAttribute('data-uri');
                        const trackName = event.target.getAttribute('data-name');
                        const trackArtist = event.target.getAttribute('data-artist');
                        addToQueue(trackUri, trackName, trackArtist);
                    });
                });
            } else {
                resultsContainer.innerHTML = '<p>No results found.</p>';
            }
        });
}

// make work with html
document.addEventListener('DOMContentLoaded', () => {
    accessToken = localStorage.getItem('spotifyAccessToken') || getAccessTokenFromUrl();
    
    if (accessToken) {
        localStorage.setItem('spotifyAccessToken', accessToken);

        // remove the access token from url
        if (window.location.hash) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }

        document.getElementById('login').style.display = 'none';
        document.getElementById('player').style.display = 'block';

        if (typeof Spotify !== 'undefined') {
            window.onSpotifyWebPlaybackSDKReady();
        }
        
        fetchLastPlayedTrack();
        
        document.getElementById('play-btn').addEventListener('click', () => {
            if (pausedTrack) {
                playTrack(pausedTrack.uri, pausedPosition);
            } else if (lastPlayedTrack) {
                playTrack(lastPlayedTrack);
            }
        });
        document.getElementById('pause-btn').addEventListener('click', pauseTrack);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        document.getElementById('search-btn').addEventListener('click', () => {
            const query = document.getElementById('search-input').value;
            searchSongs(query);
        });
    } else {
        document.getElementById('login-btn').addEventListener('click', redirectToSpotifyLogin);
    }
});
