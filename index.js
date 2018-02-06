require('console-stamp')(console, {
    pattern: 'HH:MM:ss',
    colors: {
        stamp: ['white', 'bgRed'],
        label: 'white',
    },
});
require('dotenv').config({
    path: `${__dirname}/.env`,
});

const Discord = require('discord.js');
const request = require('request-promise-native');
const ListenMoeJS = require('listenmoe.js');

const discordClient = new Discord.Client();
let discordReady = false;
const moe = new ListenMoeJS();

process.env.DISCORD_TOKEN.split(',').map(token => {
    discordClient.login(token);
});

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
    discordReady = true;
});

moe.on('updateTrack', data => {
    const songInfo = data.song;
    logDebugMessage(songInfo);

    const artists = getArtists(songInfo.artists);

    const source = getSources(songInfo.sources);

    let nowPlaying = `${artists} - ${songInfo.title}`;

    if (source) {
        nowPlaying += ` [From Anime: ${source}]`;
    }

    // Slack has a limit of 100 characters for the status message
    if (nowPlaying.length > 100) {
        nowPlaying = nowPlaying.substr(0, 98);
        nowPlaying += '..';
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
                    'status_text': currentSong,
                    'status_emoji': ':listen-moe:',
                }),
            },
        });
    }))
        .then(() => {
            console.log('Slack update: OK');
        });
}

function updateDiscord(currentSong) {
    console.log('We gon update');
    if (discordReady) {
        discordClient.user.setPresence({
            game: {
                name: currentSong,
                type: 'LISTENING',
            },
        })
            .then(() => {
                console.log('Discord update: OK');
            });

    }
}

function getArtists(artists) {
    const result = [];
    artists.map(artist => {
        const jointName = (artist.name ? artist.name : '') + (artist.nameRomaji ? (artist.name ? ' (' : '') + artist.nameRomaji + (artist.name ? ')' : '') : '');
        if (jointName !== '') result.push(jointName);
    });
    return result.join(', ');
}

function getSources(sources) {
    const result = [];
    sources.map(source => {
        const jointName = (source.nameRomaji ? source.nameRomaji : '') + (source.name ? (source.nameRomaji ? ' (' : '') + source.name + (source.nameRomaji ? ')' : '') : '');
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