const clientId = '1bb93e0197cd43eda134cc008e1d05cd';
const redirectUri = 'http://127.0.0.1:5500';
const scopes = 'streaming user-read-email user-read-private user-top-read user-modify-playback-state user-read-playback-state user-read-recently-played';

let accessToken = '';
let player = null;
let deviceId = '';

// get access token
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
    if (typeof Spotify === 'undefined') {
        console.error('Spotify SDK is not loaded.');
        return;
    }
    
    player = new Spotify.Player({
        name: 'anth keez web player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    // ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        deviceId = device_id;
    });
    
    // error handling
    player.addListener('initialization_error', ({ message }) => { console.error('Initialization Error:', message); });
    player.addListener('authentication_error', ({ message }) => { console.error('Authentication Error:', message); });
    player.addListener('account_error', ({ message }) => { console.error('Account Error:', message); });
    player.addListener('playback_error', ({ message }) => { console.error('Playback Error:', message); });
    
    player.addListener('player_state_changed', (state) => {
        if (state) {
            const track = state.track_window.current_track;
            document.getElementById('track-name').textContent = track.name;
            document.getElementById('track-artist').textContent = track.artists.map(artist => artist.name).join(', ');
            document.getElementById('track-album').textContent = track.album.name;
            document.getElementById('track-duration').textContent = formatDuration(track.duration_ms);
            document.getElementById('track-image').src = track.album.images[0].url;
            document.getElementById('release-date').textContent = track.album.release_date;
        }
    });
    
    player.connect();
};

// play da song (it plays users last played song for now)
function playLastPlayedTrack() {
    if (!deviceId) {
        console.error('No device ID available. Cannot play track.');
        return;
    }

    fetch('https://api.spotify.com/v1/me/player/recently-played', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
        .then(data => {
            if (data.items && data.items.length > 0) {
                const lastPlayedTrack = data.items[0].track;
                const trackUri = lastPlayedTrack.uri;

                fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ uris: [trackUri] }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    }
                }).then(response => {
                    if (response.ok) {
                        console.log('Playing last played track:', lastPlayedTrack.name);
                    } else {
                        console.error('Failed to play track', response);
                    }
                });
            } else {
                console.error('No recently played tracks found.');
            }
        }).catch(error => {
            console.error('Error fetching recently played tracks:', error);
        });
}

// pause da song
function pauseTrack() {
    if (!deviceId) {
        console.error('No device ID available. Cannot pause playback.');
        return;
    }
    
    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => {
        if (response.ok) {
            console.log('Playback paused');
        } else {
            console.error('Failed to pause playback', response);
        }
    });
}

// format track duration
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// make work with html
document.addEventListener('DOMContentLoaded', () => {
    accessToken = localStorage.getItem('spotifyAccessToken') || getAccessTokenFromUrl();
    
    if (accessToken) {
        localStorage.setItem('spotifyAccessToken', accessToken);

        document.getElementById('login').style.display = 'none';
        document.getElementById('player').style.display = 'block';
        
        if (typeof Spotify !== 'undefined') {
            window.onSpotifyWebPlaybackSDKReady();
        }
        
        document.getElementById('play-btn').addEventListener('click', playLastPlayedTrack);
        document.getElementById('pause-btn').addEventListener('click', pauseTrack);
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    } else {
        document.getElementById('login-btn').addEventListener('click', redirectToSpotifyLogin);
    }
});
