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

var alive = false;
var hb = null;

function init() {
    const ws = new WebSocket('wss://listen.moe/gateway', {
        perMessageDeflate: false
    });

    ws.on('open', function () {
        console.log(`Alright we got a connection. \\o/`);
        ws.send(JSON.stringify({
            op: 0,
            d: {
                auth: ''
            }
        }));
    });

    ws.on('error', function (err) {
        console.error(err);
    });

    ws.on('close', function(err) {
        if (err) console.info(err);
        console.info('%cWebsocket connection closed. Reconnecting...');
        clearInterval(sendHeartbeat);
        setTimeout(init(), reconnectInterval);
    });

    ws.on('message', function (message) {

        let response;

        try {
            response = JSON.parse(message);
        } catch (err) {
            return console.error(err);
        }

        if (response.op === 0) {
            return heartbeat(response.d.heartbeat);
        }

        if (response.op === 1) {
            if (response.t !== 'TRACK_UPDATE' && response.t !== 'TRACK_UPDATE_REQUEST') return;

            let songInfo = response.d.song;
            let artists = [];
            songInfo.artists.map(function (artist) {
                artists.push(artist.name);
            });

            let nowPlaying = `${artists.join(', ')} - ${songInfo.title}`;

            let animeName;
            if (songInfo.source[0]) {
                if (songInfo.source[0].name) {
                    animeName = songInfo.source[0].name;
                } else if (songInfo.source[0].nameRomaji) {
                    animeName = songInfo.source[0].nameRomaji;
                }
            }

            if (animeName)
                nowPlaying += ` [From Anime: ${animeName}`;

            if (nowPlaying.length >= 100) {
                nowPlaying = nowPlaying.substr(0, 98);
                nowPlaying += `..`;
            }

            updateSlack(nowPlaying);
        }
    });

    function heartbeat(heartbeat) {
        var beater = null;
        if (!alive) {
            console.info('Sending heartbeat...');
            ws.send(JSON.stringify({
                op: 9
            }));
            beater = setInterval(function () {
                ws.send(JSON.stringify({
                    op: 9
                }));
            }, heartbeat);
        } else {
            if (heartbeat != hb) {
                ws.send(JSON.stringify({
                    op: 9
                }));
                clearInterval(beater);
                beater = setInterval(function () {
                    ws.send(JSON.stringify({
                        op: 9
                    }));
                }, heartbeat);
            }
        }
    }
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

init();