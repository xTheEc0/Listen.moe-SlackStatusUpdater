# Listen.moe-SlackStatusUpdater by xTheEc0
Updates your slack status with song information from https://listen.moe  
Huge thanks to guys and gals from Listen.moe discord for helping me deal with their API : P  


UPDATE 2018-01-23 - The peeps at listen.moe released v4 of their API recently, so I updated the project (totally not because v2 that I was using was killed...)  

UPDATE 2018-01-24 - HUGE Thanks to TheAkio for wrapping up the WebSocket for Listen.moe. Code is so much simpler now!  
https://www.npmjs.com/package/listenmoe.js  
https://github.com/TheAkio/listenmoe.js


UPDATE 2018-03-27 - Now supports jpop and kpop streams. Again, made easy by TheAkio's wrapper : P


P.S: I am in no way good at js or programming. Just a little personal pet project : )

  
![]()  

  
## To launch:  
1. Download or clone repo
2. Install dependencies `npm i`
3. Add your slack token to .env file (Create here: https://api.slack.com/custom-integrations/legacy-tokens)
4. Add your discord token to .env file (Yes, this is self botting)
5. Launch with `node .` or `node index.js`  
    1. Launch jpop or kpop stream by specifying `node . kpop` (default: jpop)

![](https://puu.sh/xlvHy/6c972a1f93.png "Example output")


![]()  


### Issues:
### Not sure if this still applies, needs testing..  
After about 7 days of continous running it crashes with `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`
![](https://puu.sh/xmhcu/2841bc166d.png, "Crash stack")
But let's be honest - JavaScript needs a day off too..


![]()  


### Notes:  
If you got this far.. thanks?  
If you want to (and can) improve this code, please do, PR it, and I will (most likely) accept it : )  
~~I am more familiar with C++/C# sytax/formatting so if the formatting for my js looks like something out of horror movie for you, thats because it is. Sorry for the PTSD.~~  
Used ESLint with quite strict rules to make it _more_ human readable : D (**_cough_** *getSources and getArtists methods* **_cough_**)
