# Listen.moeSlackStatus by xTheEc0
Updates your slack status with song information from https://listen.moe  
Huge thanks to guys and gals from Listen.moe discord for helping me deal with their websocket API and promising that V4 will be much better : P

  
![]()  

  
To launch:  
1. Find all the god damn libraries/modules (not a js dev, don't know how you call them people..)
2. Add your slack token to .env file (Create here: https://api.slack.com/custom-integrations/legacy-tokens)
3. Launch `node index.js`

![](https://puu.sh/xlvHy/6c972a1f93.png "Example output")


![]()  


Issues:  
After about 7 days of continous running crashes with `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`
![](https://puu.sh/xmhcu/2841bc166d.png, "Crash stack")
But let's be honest - JavaScript needs a day off too..


![]()  


Notes:  
If you got this far.. thanks?  
If you want to (and can) improve this code, please do, PR it, and I will (most likely) accept it : )  
I am more familiar with C++/C# sytax/formatting so if the formatting for my js looks like something out of programmers horror movie, thats because it is. Sorry for the PTSD.  
