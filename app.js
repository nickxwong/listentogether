const client_id = 'de95ef31db374610aa1ebd2910a8c3c8';
const client_secret = 'c56cf730a6f442ee8fd38ce757721588'
const redirect_uri = 'http://127.0.0.1:5500/index.html';
let library_a = new Set();
let library_b = new Set();
let shared_library_URI = new Set();

function requestAuthorization() {
    let url = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURI(redirect_uri)}&show_dialog=true&scope=playlist-modify-public user-library-read`;
    window.location.href = url;
}

function checkRedirect() {
    const query_string = window.location.search;
    if (query_string.length != null) {
        handleRedirect(query_string);
    }
}

function handleRedirect(query_string) {
    const url_search_params = new URLSearchParams(query_string);
    let code = url_search_params.get('code');
    let error = url_search_params.get('error');
    if (error != null) {
        alert('ERROR 1: Authorization failed');
        console.log(error);
    } else if (code != null) {
        getAccessToken(code);
        window.history.pushState('', '', redirect_uri);
    }
}

function getAccessToken(code) {
    let request = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURI(redirect_uri)}&client_id=${client_id}&client_secret=${client_secret}`;
    let xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://accounts.spotify.com/api/token', true);
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ':' + client_secret));
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(request);
    xhr.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse() {
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        if (sessionStorage.getItem('access_a') == null) { // first account connection
            sessionStorage.setItem('access_a', data.access_token);
            getProfileInfo('a');
        } else { // second account connection
            sessionStorage.setItem('access_b', data.access_token);
            getProfileInfo('b');
        }
    } else {
        alert("ERROR 2: Authorization failed");
        console.log("Status: " + this.status);
        console.log("Response: " + this.responseText);
    }
}

function getProfileInfo(user_id) {
    callAPI('GET', 'https://api.spotify.com/v1/me', null, saveProfileInfo, user_id);
}

function callAPI(method, endpoint, request, callback, user_id) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, endpoint, true);
    if (user_id == 'a') {
        xhr.setRequestHeader('Authorization', 'Bearer ' + sessionStorage.getItem('access_a'));    
    } else { // user_id == 'b'
        xhr.setRequestHeader('Authorization', 'Bearer ' + sessionStorage.getItem('access_b'));    
    }
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(request);
    xhr.onload = (e) => {
        if (xhr.status == 200 || xhr.status == 201) {
            const response = JSON.parse(xhr.responseText);
            if (callback != null) {
                callback(user_id, response);      
            } else {
                console.log(response);
            }
        } else {
            alert("ERROR: API call failed");
            console.log("Status: " + xhr.status);
            console.log("Response: " + xhr.responseText);
        }
    };    
}

function saveProfileInfo(user_id, user_data) {
    if (sessionStorage.getItem('display_name_a') == null) { // first account connection
        sessionStorage.setItem('display_name_a', user_data.display_name);
        sessionStorage.setItem('profile_pic_a', user_data.images[0].url);
        sessionStorage.setItem('profile_id_a', user_data.id);
    } else { // second account connection
        sessionStorage.setItem('display_name_b', user_data.display_name);
        sessionStorage.setItem('profile_pic_b', user_data.images[0].url);
        sessionStorage.setItem('profile_id_b', user_data.id);
    }
    populateProfileInfo();
}

function populateProfileInfo() {
    // populate profile for user a
    if (sessionStorage.getItem('access_a') != null) {
        let display_name = document.querySelector('.user#a .header .display-name');
        let profile_pic = document.querySelector('.user#a .profile-pic img');
        display_name.innerHTML = `User: ${sessionStorage.getItem('display_name_a')}`;
        profile_pic.setAttribute('src', sessionStorage.getItem('profile_pic_a'));
    }
    // populate profile for user b
    if (sessionStorage.getItem('access_b') != null) {
        let display_name = document.querySelector('.user#b .header .display-name');
        let profile_pic = document.querySelector('.user#b .profile-pic img');
        display_name.innerHTML = `User: ${sessionStorage.getItem('display_name_b')}`;
        profile_pic.setAttribute('src', sessionStorage.getItem('profile_pic_b'));
    }
}

function createSharedPlaylist() {
    if (sessionStorage.getItem('access_a') == null || sessionStorage.getItem('access_b') == null) {
        alert("Please connect two accounts first.");
    } else {
        retrieveLibrary('a', 50, 0);
    }
}

function retrieveLibrary(user_id, limit, offset) {
    callAPI('GET', `https://api.spotify.com/v1/me/tracks?market=US&limit=${limit}&offset=${offset}`, null, saveSongs, user_id);    
}

function saveSongs(user_id, user_data) {
    let user_library = user_data.items;
    if (user_id == 'a') {
        user_library.forEach((song, i) => {
            library_a.add(song.track.name + ' - ' + song.track.artists[0].name + ' % ' + song.track.uri);
        })
        if (user_library.length == 50) {
            retrieveLibrary('a', 50, library_a.size);
        } else { // library_a fully retrieved
            retrieveLibrary('b', 50, 0);
        }
    } else { // user_id == 'b'
        user_library.forEach((song, i) => {
            library_b.add(song.track.name + ' - ' + song.track.artists[0].name + ' % ' + song.track.uri);
        })
        if (user_library.length == 50) {
            retrieveLibrary('b', 50, library_b.size);
        } else { // all libraries fully retrieved
            getLibraryUnion();
        }
    }
}

function getLibraryUnion() {
    if (library_a.size <= library_b.size) {
        library_a.forEach(song => {
            if (library_b.has(song)) {
                const song_data = song.split(' % ');
                populatePlaylistHTML(song_data[0]);
                shared_library_URI.add(song_data[1]);
            }
        })
    } else { // library_b.size < library_a.size
        library_b.forEach(song => {
            if (library_a.has(song)) {
                const song_data = song.split(' % ');
                populatePlaylistHTML(song_data[0]);
                shared_library_URI.add(song_data[1]);
            }
        })
    }
    updatePlaylistSizeHTML();
}

function populatePlaylistHTML(song) {
    const table = document.querySelector('table');
    const new_row = document.createElement('tr');
    // title
    const song_data = song.split(' - ');
    const song_title = document.createElement('td');
    song_title.textContent = song_data[0];
    new_row.appendChild(song_title);
    // artist
    const song_artist = document.createElement('td');
    song_artist.textContent = song_data[1];
    new_row.appendChild(song_artist);

    table.appendChild(new_row);
}

function updatePlaylistSizeHTML() {
    document.querySelector('#shared-playlist p').textContent = 'Playlist size: ' + shared_library_URI.size;
}

function savePlaylist() {
    const playlist_name = document.getElementById('playlist-name').value;
    const playlist_desc = `A playlist by ${sessionStorage.getItem('display_name_a')} and ${sessionStorage.getItem('display_name_b')} | Generated by listentogether`;
    createPlaylist('a', playlist_name, playlist_desc);
    // createPlaylist('b', playlist_name, playlist_desc);
}

function createPlaylist(user_id, playlist_name, playlist_desc) {
    let request = '{\"name\":\"' + playlist_name + '\",\"description\":\"' + playlist_desc + '\",\"public\":true}';
    if (user_id == 'a') {
        callAPI('POST', `https://api.spotify.com/v1/users/${sessionStorage.getItem('profile_id_a')}/playlists`, request, addSongs, user_id);    
    } else { // user_id == 'b'
        callAPI('POST', `https://api.spotify.com/v1/users/${sessionStorage.getItem('profile_id_b')}/playlists`, request, addSongs, user_id);  
    }
}

function addSongs(user_id, user_data) {
    let songs_to_add = new Array();
    let request = "";
    shared_library_URI.forEach((song_URI, i) => {
        songs_to_add.push(song_URI);
        console.log(songs_to_add.length);
        if (songs_to_add.length % 100 == 0) {
            request = JSON.stringify(songs_to_add); 
            callAPI('POST', `https://api.spotify.com/v1/playlists/${user_data.id}/tracks`, request, null, user_id);
            songs_to_add.length = 0; // empty array
        }
    })
    request = JSON.stringify(songs_to_add); 
    callAPI('POST', `https://api.spotify.com/v1/playlists/${user_data.id}/tracks`, request, null, user_id);
}