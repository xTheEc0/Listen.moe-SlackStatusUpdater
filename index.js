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
const ListenMoeJS = require('listenmoe.js');

const moe = new ListenMoeJS();

moe.on('updateTrack', data => {
    let songInfo = data.song;

    let nowPlaying = `${songInfo.artists.map(artist => artist.name).join(', ')} - ${songInfo.title}`;

    let animeName;
    if (songInfo.sources.map(source => source.name).join(', ').length > 0) {
        animeName = songInfo.sources.map(source => source.name).join(', ');
    } else if (songInfo.sources.map(source => source.nameRomaji).join(', ').length > 0) {
        animeName = songInfo.sources.map(source => source.nameRomaji).join(', ');
    }

    if (animeName)
        nowPlaying += ` [From Anime: ${animeName}]`;

    if (nowPlaying.length >= 100) {
        nowPlaying = nowPlaying.substr(0, 98);
        nowPlaying += `..`;
    }

    updateSlack(nowPlaying);
});

moe.connect();

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