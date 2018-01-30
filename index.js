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

    let artists = getArtists(songInfo.artists);

    let source = getSources(songInfo.sources);

    let nowPlaying = `${artists} - ${songInfo.title}`;

    if (source)
        nowPlaying += ` [From Anime: ${source}]`;

    if (nowPlaying.length >= 100) {
        nowPlaying = nowPlaying.substr(0, 98);
        nowPlaying += `..`;
    }

    updateSlack(nowPlaying);
});

moe.on('error', (error) => {
    console.error(error);
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

function getArtists(artists) {
    var result = [];
    artists.map(function (artist) {
        var jointName = (artist.name ? artist.name : '') + (artist.nameRomaji ? (artist.name ? ' (' : '') + artist.nameRomaji + (artist.name ? ')' : '') : '');
        if (jointName !== '') result.push(jointName);
    });
    return result.join(', ');
}

function getSources(sources) {
    var result = [];
    sources.map(function (source) {
        var jointName = (source.nameRomaji ? source.nameRomaji : '') + (source.name ? (source.nameRomaji ? ' (' : '') + source.name + (source.nameRomaji ? ')' : '') : '');
        if (jointName !== '') result.push(jointName);
    });
    return result.join(', ');
}
