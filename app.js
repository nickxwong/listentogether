const client_id = 'de95ef31db374610aa1ebd2910a8c3c8';
const client_secret = 'c56cf730a6f442ee8fd38ce757721588'
const redirect_uri = 'http://127.0.0.1:5500/index.html';
let user_library = new Set();

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
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
    } else {
        alert("ERROR 2: Authorization failed");
        console.log("Status: " + this.status);
        console.log("Response: " + this.responseText);
    }
}

function retrieveLibrary() {
    let request = 'market=US&limit=50&offset=0';
    callAPI('GET', 'https://api.spotify.com/v1/me/tracks', request, saveSongs);
}

function callAPI(method, endpoint, request, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, endpoint, true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('access_token'));
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(request);
    xhr.onload = callback;
}

function saveSongs() {
    if (this.status == 200) {
        let song_list = JSON.parse(this.responseText).items;
        song_list.forEach((song, i) => {
            user_library.add(song.track.name + ' - ' + song.track.artists[0].name);
        })
    } else {
        alert("ERROR 3: Song retrieval failed");
        console.log("Status: " + this.status);
        console.log("Response: " + this.responseText);
    }
}

function listSongs() {
    console.log(user_library);
}