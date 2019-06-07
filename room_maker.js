var exports = module.exports = {};

var rooms = {};
var dirs = {};

//https://stackoverflow.com/questions/33514915/what-s-the-difference-between-and-while-declaring-a-javascript-array

rooms.entrances = [
    "You've come to party?\n**PARTAYYY!**",
    "The entrance to the dungeon gapes a'front of you with stones portrayed in a fashion like teeth waiting for their next meal to chomp on.",
    "After losing your way a multitude of times, your party has finally met the entrance to the dungeon. How well will that play out while you're down there?",
    "Welcome your party to their graves: The dungeon.",
    "How long will I spend writing scripts for the dungeon entrances instead of coding it? Who knows.",
    "Welcome to the dungeon. I have one question for you: Why a dungeon? You could go on a crusade, but instead THIS is how you decide to end your life?",
    "*whispers from the dungeon*\n'I'm blue daba dee dabu die...'\nAre you quite sure you want to continue? (I wouldn't after hearing that)"
];

rooms.dungeons = [
    "You're in a humid sarcophagus under the earth. Your anxiety makes you feel like something sinister is breathing down your neck. Turns out it was your party member.",
    "The air is cold, humid, and rigid like the walls that surround you and your party. This room isn't quite as different from the last.",
    "Have you gone in circles? This room is just as uninviting as the last one.",
    "The rooms seem to be getting smaller. That's either your anxiety getting the best of you, or there is something sinister about this place.",
    "You dropped your torch, only to see a fleeting show of sparks and flames. The torch is fine, but the spiders are now homeless."
];

rooms.ravager = [
    "A snarl erupts not far from your party.",
    "You glimpse a moving shadow, but put it up to your mind playing tricks on you--that is, until you hear a low, menacing rumble.",
    "Your silly party has come into the clutches of an enemy!",
    "'What was that?'",
    "You sweep your torch across the expanse of the room, and are greeted by a rather rudely awoken beast."
];

rooms.chest = [
    "Your party has stumbled upon a possible treasure!",
    "You take the torch to inspect an object. You happen to get too close, and it lights on fire. One of your party members had to douse it with their canteen to put it out.",
    "'What could be inside?' Your party asks.",
    "ARR! SECRET TREASUR'!",
    "Well, well, well... what do we have here?"
];

rooms.key = [
    "Ohhh! SHINY!",
    "This key is probably important. What could it go to?",
    "Hopefully this isn't another traveler's key. These are hard to come by.",
    "A key? That means there's a door! Er... something it goes to.",
    "Well, well, well... what do we have here?"
];

rooms.crystals = [
    "Ohhh! SHINY!",
    "I don't think these grow naturally. Or do they? Shrooms?",
    "1-2-3... there should be enough to go around!",
    "Haha, there's enough here for a round at the #travelers-watch!",
    "Well, well, well... what do we have here?"
];

rooms.materials = [
    "Ohhh! SHINY!",
    "This should be useful.",
    "There are some slightly valuable thing's poking out of the debris, disgusting as they may be.",
    "What's this? There's some junk on the floor. Maybe someone will find it useful.",
    "Well, well, well... what do we have here?"
];

dirs.north = "Your party can move **North**"
dirs.south = "Your party can move **South**"
dirs.west = "Your party can move **West**"
dirs.east = "Your party can move **East**"

exports.write_room = function(data) {
    var local_data = {}

    local_data.dungeon = "``` Hell's Gate ```"
    local_data.location = "..."


    if (data.stash.includes("entrance")) {
        local_data.desc = rooms.entrances[Math.floor(Math.random()*rooms.entrances.length)]
    } else {
        local_data.desc = rooms.dungeons[Math.floor(Math.random()*rooms.dungeons.length)]
    }

    if (data.stash.includes("chest")) {
        local_data.chest_title = ":coffin: You've found a CHEST."
        local_data.chest = rooms.chest[Math.floor(Math.random()*rooms.chest.length)]
    }

    if (data.stash.includes("ravager")) {
        local_data.ravager_title = ":bangbang: You've encountered a RAVAGER."
        local_data.ravager = rooms.ravager[Math.floor(Math.random()*rooms.ravager.length)]
    }

    if (data.stash.includes("key")) {
        local_data.key_title = ":key: You've found a KEY."
        local_data.key = rooms.key[Math.floor(Math.random()*rooms.key.length)]
    }

    if (data.stash.includes("crystals")) {
        local_data.crystals_title = ":moneybag: You've found CRYSTALS."
        local_data.crystals = rooms.crystals[Math.floor(Math.random()*rooms.crystals.length)]
    }


    if (data.stash.includes("materials")) {
        local_data.materials_title = ":grey_question: You've found MATERIALS."
        local_data.materials = rooms.materials[Math.floor(Math.random()*rooms.materials.length)]
    }

    if (data.status.includes("door")) {
        local_data.door_title = ":door: You opened a door."
        local_data.door = ":eyes:"
    }

    if (data.stash.includes("end")) {
        local_data.end_title = ":eject: Your party has stumbled upon the exit from the dungeon!"
        local_data.end = ":100:"
    }


    return local_data
}