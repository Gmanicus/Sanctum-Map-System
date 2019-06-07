# Sanctum-Map-System
Map system for the Discord game [Sanctum](https://discord.gg/CBWkESc). Although it is currently not in use, it is a fully functional Node.JS, image generated map with item, movement, session systems, and more built in. Feel free to use it for whatever you need.

![img](https://cdn.discordapp.com/attachments/501586132375568399/520047743612223488/dungeon.png)

## Usage:

First, require the dungeonmaker.js script via import:
```javascript
const map = require('./dungeonmaker.js');
```

### Preperation:

Next, you *must* prepare to use `Async`, as much of the map gen API requires awaiting.
To start generating the map, create a new session:
```javascript
map.session(mode);
// "mode" can be left out or set to "auto". If left out, the map will not generate any tiles or starting pos. If set to "auto", it will do just that as well as place items, doors, and the end point.
```

Now, before generating tiles, disable/enable any settings you'd like:
```javascript
map.session.disableAutoStashing(); // Don't place stashes automatically
map.session.disableAutoEnd(); // Don't place the exit automatically
map.session.disableAutoHide(); // Don't hide tiles that we haven't explored
```

### Generation:

Place tiles willy-nilly. The map generator will warn you if you go out of bounds or etc.
```javascript
map.session.placeCorridor([0, 8], [10, 8]);
map.session.placeCorridor([0, 8], "East");

// The second parameter ("to") can be *alternatively* submitted as a compass direction in string format for staggered placement, at the cost of an accurate stopping point.
```

Set any tile data that you wish. This can be especially handy for creating text-based adventures with quests and etc.
```javascript
map.session.setTileData([2, 3], {stash: "key", status: "unexplored"});

// You can add more to this list. "stash" and "status" are values that are planned for us in Sanctum.
// Stash can be set to "end". This can be moved past, but also will act as an exit when movement comes around.
// Status can be set to "unexplored", "explored", "current", and "door". "current" is highly discouraged, as it WILL screw with the movement system.
//Setting status to "door" will make this tile a discoverable door. Keys are needed to get past these.
```

Set the player pos (if you wish to do so manually. Defaults to first tile placed. It will only check to see if you placed within map boundaries).
```javascript
map.session.setPlayerPos([1, 3]);
```

### Completion:

Once you're all done, complete the map. Make sure to grab the session that is returned. This is required to retrieve the map and minimap image.
```javascript
var our_session = await map.session.complete();
```

### Get Images:

The map is completed! Congrats. Now pay $2.99 for rights to the generated images! Just kidding, I'm not EA. Here's how you do it:
```javascript
// As is, these supply discord embeds. I didn't set this up for non-discord use, so you will have to adjust the API get...Image() functions to return the actual images for the time being. I should update this eventually.

var map_img = await map.session.getMapImage(our_session));
var minimap_img = msg_channel.send(await map.session.getMinimapImage(our_session));

// map.session.getMapData(our_session); <- Use this function to print the map to console. Obviously it won't look great, but it allows for some quick testing! It also returns all the map data, so set it to a variable if you need the info!
```

### Movement:

Now to the juicy part: Movement...
```javascript
await map.session.update(our_session);
await map.session.update.leap("east", our_session);

// Yup, that's it. There's so much you dont see...
// Anyway, make sure to update the session before actually leaping. It is neccessito!
```

### Ending Session:

Once you've used the map to your hearts content, ***ERASE IT FROM THE FACE OF THE EARTH***.
```javascript
map.session.end(our_session);
// This deletes the associated images and session data.
```

## Conclusion:

And that concludes the map generation and movement. You can use this to host multiple galliant text adventures at the same time, or even use it for epic overkill to generate a tile-based word. I dunno, you're choice.



![img](https://cdn.discordapp.com/attachments/501586156975030273/509488023759749130/concept-export.png)

![img](https://i.imgur.com/u4aIXUN.png)
