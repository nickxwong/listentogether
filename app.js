const client_id = 'de95ef31db374610aa1ebd2910a8c3c8';
const client_secret = 'e6858459085e473f9f13f831fec784c8';
const redirect_uri = 'http://127.0.0.1:5500/index.html';

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
    console.log(this.status);
    if (this.status == 200) {
        let data = JSON.parse(this.responseText);
        const access_token = this.access_token;
        const refresh_token = this.refresh_token;
    } else {
        alert("ERROR 2: Authorization failed");
        console.log("Status: " + this.status);
        console.log("Response: " + this.responseText);
    }
}