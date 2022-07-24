const client_id = 'de95ef31db374610aa1ebd2910a8c3c8';
const client_secret = 'c56cf730a6f442ee8fd38ce757721588'
const redirect_uri = 'http://127.0.0.1:5500/index.html';
let library_a = new Set();
let shared_library = new Set();

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
        if (xhr.status == 200) {
            const response = JSON.parse(xhr.responseText);
            callback(user_id, response);    
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
    } else { // second account connection
        sessionStorage.setItem('display_name_b', user_data.display_name);
        sessionStorage.setItem('profile_pic_b', user_data.images[0].url);
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
        retrieveLibrary('a');
    }
}

function retrieveLibrary(user_id) {
    let request = 'market=US&limit=50&offset=0';
    if (user_id == 'a') {
        callAPI('GET', 'https://api.spotify.com/v1/me/tracks', request, saveSongs, user_id);    
    } else { // user_id == 'b'
        callAPI('GET', 'https://api.spotify.com/v1/me/tracks', request, getLibraryUnion, user_id);
    }
    
}

function saveSongs(user_id, user_data) {
    let user_library = user_data.items;
    user_library.forEach((song, i) => {
        library_a.add(song.track.name + ' - ' + song.track.artists[0].name);
    })
    retrieveLibrary('b');
}

function getLibraryUnion(user_id, user_data) {
    let user_library = user_data.items;
    user_library.forEach((song, i) => {
        let cur_song = song.track.name + ' - ' + song.track.artists[0].name;
        if (library_a.has(cur_song)) {
            shared_library.add(cur_song);
        }
    })
    shared_library.forEach((song, i) => {
        console.log(song);
    })
    
}
