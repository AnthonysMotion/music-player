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

// Fetch user data and update the DOM
function fetchUserData() {
    if (!accessToken) {
        console.error('No access token available.');
        return;
    }

    // fetch user profile
    fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
      .then(data => {
        console.log('User Profile Data:', data);
        document.getElementById('user-name').textContent = data.display_name;
        document.getElementById('user-profile-picture').src = data.images[0]?.url || 'default-profile.png';
    }).catch(error => console.error('Error fetching user profile:', error));

    fetch('https://api.spotify.com/v1/me/top/tracks?limit=5', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
      .then(data => {
        console.log('Top Tracks Data:', data);
        const tracksList = document.getElementById('top-tracks');
        tracksList.innerHTML = '';
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach(track => {
                const trackItem = document.createElement('li');
                trackItem.textContent = `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
                tracksList.appendChild(trackItem);
            });
        } else {
            tracksList.innerHTML = '<li>No top tracks available.</li>';
        }
    }).catch(error => console.error('Error fetching top tracks:', error));

    fetch('https://api.spotify.com/v1/me/top/artists?limit=5', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    }).then(response => response.json())
      .then(data => {
        console.log('Top Artists Data:', data);
        const artistsList = document.getElementById('top-artists');
        artistsList.innerHTML = '';
        if (data.items && Array.isArray(data.items)) {
            data.items.forEach(artist => {
                const artistItem = document.createElement('li');
                artistItem.textContent = artist.name;
                artistsList.appendChild(artistItem);
            });
        } else {
            artistsList.innerHTML = '<li>No top artists available.</li>';
        }
    }).catch(error => console.error('Error fetching top artists:', error));
}

// make work with html
document.addEventListener('DOMContentLoaded', () => {
    accessToken = localStorage.getItem('spotifyAccessToken') || getAccessTokenFromUrl();
    
    if (accessToken) {
        localStorage.setItem('spotifyAccessToken', accessToken);

        fetchUserData();
    } else {
        console.error('No access token available.');
    }
});
