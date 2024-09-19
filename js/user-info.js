const clientId = '1bb93e0197cd43eda134cc008e1d05cd';
const redirectUri = 'http://127.0.0.1:5500';
const scopes = 'user-read-private user-read-email user-top-read';

let accessToken = '';

// get spotify access token
function getAccessTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

// fetch user data
function fetchUserData() {
    if (!accessToken) {
        return;
    }

    // fetch user profile
    fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
      .then(data => {
        document.getElementById('user-name').textContent = data.display_name;
        document.getElementById('user-profile-picture').src = data.images[0]?.url || 'default-profile.png';
    });

    fetch('https://api.spotify.com/v1/me/top/tracks?limit=5', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
      .then(data => {
        const tracksList = document.getElementById('top-tracks');
        tracksList.innerHTML = '';
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach(track => {
                const trackItem = document.createElement('li');
                trackItem.textContent = `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
                tracksList.appendChild(trackItem);
            });
        } else {
            tracksList.innerHTML = '<li>no top tracks</li>';
        }
    });

    fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
      .then(data => {
        const artistsList = document.getElementById('top-artists');
        artistsList.innerHTML = '';
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach(artist => {
                const artistItem = document.createElement('li');
                artistItem.textContent = artist.name;
                artistsList.appendChild(artistItem);
            });
        } else {
            artistsList.innerHTML = '<li>no top artists</li>';
        }
    });
}

// make work with html
document.addEventListener('DOMContentLoaded', () => {
    accessToken = localStorage.getItem('spotifyAccessToken') || getAccessTokenFromUrl();
    
    if (accessToken) {
        localStorage.setItem('spotifyAccessToken', accessToken);

        fetchUserData();
    }
});
