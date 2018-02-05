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

const Discord = require('discord.js');
const request = require('request-promise-native');
const ListenMoeJS = require('listenmoe.js');

const discordClient = new Discord.Client();
const moe = new ListenMoeJS();

process.env.DISCORD_TOKEN.split(',').map(token => {
    discordClient.login(token);
});

moe.on('updateTrack', data => {
    let songInfo = data.song;
    logDebugMessage(songInfo);

    let artists = getArtists(songInfo.artists);

    let source = getSources(songInfo.sources);

    let nowPlaying = `${artists} - ${songInfo.title}`;

    if (source)
        nowPlaying += ` [From Anime: ${source}]`;

    // Slack has a limit of 100 characters for the status message
    if (nowPlaying.length > 100) {
        nowPlaying = nowPlaying.substr(0, 98);
        nowPlaying += `..`;
    }

    updateSlack(nowPlaying);
    updateDiscord(nowPlaying);
    console.log(`Listen.moe: ${nowPlaying}\n`);

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
}

function updateDiscord(currentSong) {
    discordClient.on('ready', () => {
        discordClient.user.setPresence({
            game: {
                name: currentSong,
                type: "LISTENING"
            }
        });
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

function logDebugMessage(songInfo) {
    console.log(songInfo);
    console.log('Source normal: ' + songInfo.sources.map(source => source.name).join(', '));
    console.log('Source romaji: ' + songInfo.sources.map(source => source.nameRomaji).join(', '));
    console.log('Artist romaji: ' + songInfo.artists.map(artist => artist.nameRomaji));
    console.log('Artist normal: ' + songInfo.artists.map(artist => artist.name).join(', '));
}