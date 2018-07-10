const dotEnv = require('dotenv');
const retry = require('retry-function-promise');
const Discord = require('discord.js');
const request = require('request-promise-native');
const ListenMoeJS = require('listenmoe.js');
require('console-stamp')(console, {
    pattern: 'HH:MM:ss',
    colors: {
        stamp: ['white', 'bgRed'],
        label: 'white',
    },
});

dotEnv.config({ path: `${__dirname}/.env` });
const { DEBUG, DISCORD_TOKEN, SLACK_TOKEN } = process.env;

const moeStream = process.argv[2] ? (process.argv[2].toLowerCase() == 'kpop' ? 'kpop' : 'jpop') : 'jpop';
console.log(`Selected stream: ${moeStream}`);

const discordClient = new Discord.Client();
discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);
});

const moe = new ListenMoeJS(moeStream);

moe.on('updateTrack', async (data) => {
    const songInfo = data.song;

    if (DEBUG) logDebugMessage(songInfo);

    const artists = songInfo.artists
        .filter(({ name, nameRomaji }) => name || nameRomaji)
        .map(({ name, nameRomaji }) => (name + (nameRomaji ? ` (${nameRomaji})` : '')) || nameRomaji)
        .join(', ');

    const source = songInfo.sources
        .filter(({ name, nameRomaji }) => name || nameRomaji)
        .map(({ name, nameRomaji }) => (nameRomaji + (name ? ` (${name})` : '')) || name)
        .join(', ');

    const title = songInfo.title + (songInfo.titleRomaji ? ` (${songInfo.titleRomaji})` : '');

    const nowPlaying = `${artists} - ${title}` + (source ? ` [From Anime: ${source}]` : '');

    try {
        await Promise.all([
            updateSlack(nowPlaying),
            updateDiscord(nowPlaying),
        ]);
        console.log(`Listen.moe: ${nowPlaying}\n`);
    }
    catch (e) {
        console.error(e);
    }
});

moe.on('error', (error) => console.error(error));

async function main() {
    // starting with discord since discord login is async while moe doesnt return promise and is harder to catch
    try {
        await retry(5, 2000, [discordClient, discordClient.login], [DISCORD_TOKEN]);
        console.log('Logged in to discord succesfully');
        moe.connect();
        return;
    }
    catch (e) {
        if (e.message != 'Incorrect login details were provided') {
            try {
                await retry(5, 2000, [discordClient, discordClient.login], [DISCORD_TOKEN]);
            }
            catch (err) {
                console.error('All retries were unsuccessful, could not connect to discord');
                console.error(err);
            }
        }
        throw e;
    }
    finally {
        moe.connect();
    }
}

async function updateSlack(currentSong) {
    const statusText = (currentSong.length > 100) ? currentSong.substr(0, 98) + '..' : currentSong;
    const d = await request.post('https://slack.com/api/users.profile.set', {
        form: {
            token: SLACK_TOKEN,
            profile: JSON.stringify({
                'status_text': statusText,
                'status_emoji': ':listen-moe:',
            }),
        },
    });
    if (!JSON.parse(d).ok) throw new Error(JSON.parse(d).error);
    return;
}

async function updateDiscord(currentSong) {
    await discordClient.user.setPresence({
        game: {
            name: currentSong,
            type: 'LISTENING',
        },
    });
}

function logDebugMessage(songInfo) {
    console.log('');
    console.log('--- --- --- --- --- --- ---');
    console.log(songInfo);
    console.log('');
    console.log(`Artist normal: ${songInfo.artists.map(artist => artist.name).join(', ')}`);
    console.log(`Artist romaji: ${songInfo.artists.map(artist => artist.nameRomaji).join(', ')}`);
    console.log(`Source normal: ${songInfo.sources.map(source => source.name).join(', ')}`);
    console.log(`Source romaji: ${songInfo.sources.map(source => source.nameRomaji).join(', ')}`);
    console.log(`Title normal: ${songInfo.title}`);
    console.log('Title romaji: ' + (songInfo.titleRomaji ? songInfo.titleRomaji : ''));
    console.log('');
}

main().catch((e) => console.error(e));