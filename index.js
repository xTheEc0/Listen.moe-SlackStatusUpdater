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

const stream = process.argv[2] ? (process.argv[2].toLowerCase() == 'kpop' ? 'kpop' : 'jpop') : 'jpop';

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

let debugOutput = false;
console.log(`Selected stream: ${stream}`);

__INIT__().catch((e) => console.error(e));

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
});

moe.on('updateTrack', (data) => {
    const songInfo = data.song;

    if (debugOutput) logDebugMessage(songInfo);

    let artists = getArtists(songInfo.artists);
    let source = getSources(songInfo.sources);
    let title = getTitle(songInfo.title, songInfo.titleRomaji);

    let nowPlaying = `${artists} - ${title}`;

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
        .catch((e) => {
            if (e) console.error(e);
        })
        // update discord if fails go to catch
        .then(() => updateDiscord(nowPlaying))
        .catch((e) => {
            if(e) console.error(e);
        })
        // if resolved show output
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
            .then((d) => resolve(!JSON.parse(d).ok ? `Slack error: ${JSON.parse(d).error}` : `Slack update: OK`))
            .catch((e) => reject(`Slack update: ERROR\n ${e}`));
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
                .then(() => resolve(`Discord update: OK`))
                .catch((e) => reject(`Discord update: ERROR\n ${e}`));
        }
        else {
            console.log(`Discord error: Login unsuccessful\n`);
            reject();
        }
    });
}

const getArtists = artists => artists
    .filter(({ name, nameRomaji }) => name || nameRomaji)
    .map(({ name, nameRomaji }) => (name + (nameRomaji ? `(${nameRomaji})` : '')) || nameRomaji)
    .join(', ');

const getSources = sources => sources
    .filter(({ name, nameRomaji }) => name || nameRomaji)
    .map(({ name, nameRomaji }) => (nameRomaji + (name ? `(${name})` : '')) || name)
    .join(', ');

function getTitle(title, titleRomaji) {
    let jointTitle = title + (titleRomaji ? ` (${titleRomaji})` : ``);
    return jointTitle;
}

function logDebugMessage(songInfo) {
    console.log(``);
    console.log(`--- --- --- --- --- --- ---`);
    console.log(songInfo);
    console.log(``);
    console.log(`Artist normal: ${songInfo.artists.map(artist => artist.name).join(', ')}`);
    console.log(`Artist romaji: ${songInfo.artists.map(artist => artist.nameRomaji).join(', ')}`);
    console.log(`Source normal: ${songInfo.sources.map(source => source.name).join(', ')}`);
    console.log(`Source romaji: ${songInfo.sources.map(source => source.nameRomaji).join(', ')}`);
    console.log(`Title normal: ${songInfo.title}`);
    console.log(`Title romaji: ` + (songInfo.titleRomaji ? songInfo.titleRomaji : ``));
    console.log(``);
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
                if (e.message != `Incorrect login details were provided.`) {
                    retry(5, 2000, [discordClient, discordClient.login], [DISCORD_TOKEN])
                        .then(() => {
                            console.log(`Logged in to discord succesfully`);
                        })
                        .catch((err) => {
                            console.error(`All retries were unsuccessful, could not connect to discord`);
                            console.error(err);
                        });
                }
                moe.connect();
                reject(e.message);
            });
    });
}