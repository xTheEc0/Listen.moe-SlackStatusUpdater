// Colored console print out
require('console-stamp')(console, {
    pattern:'HH:MM:ss',
    colors: {
        stamp: ["white", "bgRed"],
        label: "white"
    }
});

var request = require('request-promise-native');

require('dotenv').config({ path: `${__dirname}/.env`,});

const WebSocket = require('ws');

var reconnectInterval = 5 * 1000; // 5 second reconnect

var connectToRadio = function() {
    const ws = new WebSocket('https://listen.moe/api/v2/socket');

    ws.on('open', function() {
    });

    ws.on('message', function incoming(data) {
        // If received data is dead return and try again
        if(!data) return; 

        // Parse the JSON from Listen.moe
        var parsed = JSON.parse(data);

        // If the data received is undefined - try again
        if(!parsed.song_name && !parsed.artist_name) return;

        var nowPlaying = `${parsed.artist_name} - ${parsed.song_name}`; 
       
       // If anime name is present (not null) add it to string
        if (parsed.anime_name) nowPlaying += ` [From Anime: ${parsed.anime_name}]`; 
        
        // Truncate string if we exceed 100 symbols (max slack status)
        if(nowPlaying.length >= 100) {
            nowPlaying = nowPlaying.substring(0, 98);
            nowPlaying += "..";
        }

        // Send relevant information to slack for status update
        Promise.all(process.env.SLACK_TOKEN.split(',').map(token => {
            return request.post('https://slack.com/api/users.profile.set', {
                form: {
                    token: token,
                    profile: JSON.stringify({
                        "status_text": nowPlaying,
                        "status_emoji":":listen-moe:",
                    })
                }
            })
        }))
        .then(() => {
            console.log(`Listen.moe: ${nowPlaying}\n`);
        });
    });

    ws.on('error', function() {
        setTimeout(connectToRadio, reconnectInterval);
    });

    ws.on('close', function() {
        setTimeout(connectToRadio, reconnectInterval);
    });
};

connectToRadio();
