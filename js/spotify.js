const clientId = '1bb93e0197cd43eda134cc008e1d05cd';  // Replace with your Spotify Client ID
const redirectUri = 'http://127.0.0.1:5500';  // Replace with your Redirect URI
const scopes = 'streaming user-read-email user-read-private user-top-read user-modify-playback-state user-read-playback-state';

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

function redirectToSpotifyLogout() {
    // Clear the access token from local storage
    localStorage.removeItem('spotifyAccessToken');
    // Redirect to the Spotify logout URL
    window.location = 'https://accounts.spotify.com/logout';
}

window.onSpotifyWebPlaybackSDKReady = () => {
    if (typeof Spotify === 'undefined') {
        console.error('spotify sdk not ready');
        return;
    }
    
    player = new Spotify.Player({
        name: 'anth keez web player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
        deviceId = device_id;
    });
    
    player.addListener('initialization_error', ({ message }) => { console.error('Initialization Error:', message); });
    player.addListener('authentication_error', ({ message }) => { console.error('Authentication Error:', message); });
    player.addListener('account_error', ({ message }) => { console.error('account error: ', message); });
    player.addListener('playback_error', ({ message }) => { console.error('playback error: ', message); });
    
    player.addListener('player_state_changed', (state) => {
        if (state) {
            document.getElementById('track-name').textContent = state.track_window.current_track.name;
        }
    });
    
    player.connect();
};

// play da song (its set to tsubi club - laced up for now)
function playTrack() {
    if (!deviceId) {
        console.error('no device id');
        return;
    }
    
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: ['spotify:track:7BmPwqjDJUoSjMFitrqs4Z'] }),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => {
        if (!response.ok) {
            console.error('track cannot play: ', response);
        }
    }).catch(error => console.error('Error playing track:', error));
}

// pause da song
function pauseTrack() {
    if (!deviceId) {
        console.error('no device id');
        return;
    }
    
    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => {
        if (!response.ok) {
            console.error('cannot pause: ', response);
        }
    }).catch(error => console.error('Error pausing playback:', error));
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
        } else {
            console.error('spotify sdk not loaded');
        }
        
        document.getElementById('play-btn').addEventListener('click', playTrack);
        document.getElementById('pause-btn').addEventListener('click', pauseTrack);
        document.getElementById('logout-btn').addEventListener('click', redirectToSpotifyLogout);
    } else {
        document.getElementById('login-btn').addEventListener('click', redirectToSpotifyLogin);
    }
});
