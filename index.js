require('console-stamp')(console, {
    pattern: 'HH:MM:ss',
    colors: {
        stamp: ["white", "bgRed"],
        label: "white"
    }
});
require('dotenv').config({
    path: `${__dirname}/.env`
});
const request = require('request-promise-native');
const WebSocket = require('ws');

const reconnectInterval = 5 * 1000; // 5 second reconnect
var lastSong = ""; // Cached song info

function connectToRadio() {
    const ws = new WebSocket('https://listen.moe/api/v2/socket', {
        perMessageDeflate: false
    });

    ws.on('open', function open() {
        console.log(`Connected. Getting information..`);
    });

    ws.on('message', function incoming(data) {
        if (!data) return;

        var parsed = JSON.parse(data);
        var nowPlaying = `${parsed.artist_name} - ${parsed.song_name}`;

        if (parsed.anime_name)
            nowPlaying += ` [From Anime: ${parsed.anime_name}]`;

        if (nowPlaying.length >= 100) {
            nowPlaying = nowPlaying.substr(0, 98);
            nowPlaying += `..`;
        }

        if (lastSong == nowPlaying)
            return;
        else
            lastSong = nowPlaying;

        updateSlack(nowPlaying);
    });

    ws.on('error', function() {
        console.error(`Connection Error. Reconnecting..`);
        setTimeout(connectToRadio, reconnectInterval);
    });

    ws.on('close', function() {
        console.error(`Connection Closed. Reconnecting..`);
        setTimeout(connectToRadio, reconnectInterval);
    });
}

function updateSlack(currentSong) {
    Promise.all(process.env.SLACK_TOKEN.split(',').map(token => {
            return request.post('https://slack.com/api/users.profile.set', {
                form: {
                    token: token,
                    profile: JSON.stringify({
                        "status_text": currentSong,
                        "status_emoji": ":listen-moe:"
                    })
                }
            })
        }))
        .then(() => {
            console.log(`Listen.moe: ${currentSong}\n`);
        })
}

connectToRadio();