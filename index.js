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

const stream = process.argv[2].toLowerCase() == 'kpop' ? 'kpop' : 'jpop';

const {
    DISCORD_TOKEN,
    SLACK_TOKEN,
} = process.env;

const retry = require('retry-function-promise');
const Discord = require('discord.js');
const request = require('request-promise-native');
const ListenMoeJS = require('listenmoe.js');

const discordClient = new Discord.Client();
let discordReady = false;
const moe = new ListenMoeJS(stream);

const debugOutput = false;
console.log('Selected stream: ' + stream);

__INIT__().catch((e) => console.error(e));

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
});

moe.on('updateTrack', (data) => {
    const songInfo = data.song;

    if (debugOutput) logDebugMessage(songInfo);

    const artists = getArtists(songInfo.artists);
    const source = getSources(songInfo.sources);

    let nowPlaying = `${artists} - ${songInfo.title}`;

    if (source) {
        nowPlaying += ` [From Anime: ${source}]`;
    }

    // Slack has a limit of 100 characters for the status message
    nowPlaying = (nowPlaying.length > 100) ? nowPlaying.substr(0, 98) + '..' : nowPlaying;

    Promise.resolve(true)
        // update slack if fails go to catch
        .then(() => updateSlack(nowPlaying))
        .catch((e) => {
            if (e) console.error(e);
        })
        // if resolved show output
        .then(logUpdateStatus)
        .catch((e) => {
            if (e) console.error(e);
        })
        // update discord if fails go to catch
        .then(() => updateDiscord(nowPlaying))
        .catch((e) => {
            if(e) console.error(e);
        })
        // if resolved show output
        .then(logUpdateStatus)
        .catch((e) => {
            if (e) console.error(e);
        })
        // error of the one that rejected first
        .then(() => {
            console.log(`Listen.moe: ${nowPlaying}\n`);
        })
        .catch((e) => {
            if (e) console.error(e);
        });
});

moe.on('error', (error) => console.error(error));

function updateSlack(currentSong) {
    return new Promise((resolve, reject) => {
        request.post('https://slack.com/api/users.profile.set', {
            form: {
                token: SLACK_TOKEN,
                profile: JSON.stringify({
                    'status_text': currentSong,
                    'status_emoji': ':listen-moe:',
                }),
            },
        })
            .then((d) => resolve(!JSON.parse(d).ok ? 'Slack error: ' + JSON.parse(d).error : 'Slack update: OK'))
            .catch((e) => reject('Slack update: ERROR\n' + e));
    });
}

function updateDiscord(currentSong) {

    return new Promise((resolve, reject) => {
        if (discordReady) {
            discordClient.user.setPresence({
                game: {
                    name: currentSong,
                    type: 'LISTENING',
                },
            })
                .then(() => resolve('Discord update: OK'))
                .catch((e) => reject('Discord update: ERROR\n' + e));
        }
        else {
            console.log('Discord error: Login unsuccessful\n');
            reject();
        }
    });
}

function getArtists(artists) {
    const result = [];
    artists.map((artist) => {
        const jointName = (artist.name ? artist.name : '') + (artist.nameRomaji ? (artist.name ? ' (' : '') + artist.nameRomaji + (artist.name ? ')' : '') : '');
        if (jointName !== '') result.push(jointName);
    });
    return result.join(', ');
}

function getSources(sources) {
    const result = [];
    sources.map((source) => {
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

function logUpdateStatus(input) {
    if (debugOutput) {
        console.log(input);
    }
}

function __INIT__() {
    return new Promise((resolve, reject) => {
        // starting with discord since discord login is async while moe doesnt return promise and is harder to catch
        discordClient
            .login(DISCORD_TOKEN)
            .then(() => {
                discordReady = true;
                moe.connect();
                resolve();
            }).catch((e) => {
                if (e.message != 'Incorrect login details were provided.') {
                    retry(5, 2000, [discordClient, discordClient.login], [DISCORD_TOKEN])
                        .then(() => {
                            console.log('Logged in to discord succesfully');
                        })
                        .catch((err) => {
                            console.error('All retries were unsuccessful, could not connect to discord');
                            console.error(err);
                        });
                }
                moe.connect();
                reject(e.message);
            });
    });
}