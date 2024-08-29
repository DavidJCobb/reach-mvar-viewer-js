
A browser-based utility that can load and parse Halo: Reach map variants (`*.mvar`) and display information about their contents. Run `index.html` on a local web server to use it. (Browsers don't allow JavaScript to fetch-request to local files even in the same directory, so this utility can't be run locally. [Blame smartphones.](https://www.mozilla.org/en-US/security/advisories/mfsa2019-21/#CVE-2019-11730))

It can currently load the following information accurately:

* Map data
  * UGC header (name, description, authorship, etc.)
  * Cached map budget info (usage and max)
  * Forge labels
  * Min Count and Max Count for all used object types
* Objects
  * Type indices (requires information from the base canvas (`*.map`) to identify the type from these)
  * Position
  * Respawn Time
  * Team
  * Color
  * Shape
  * Gametype-Specific
  * Placed at Start
  * Spawn Sequence
  * Forge label
  * Named Location options
    * Name index
  * Teleporter options
    * Channel
    * Allow/Deny object types
  * Weapon options
    * Spare Clips

It can currently load the following information, but I can't yet tell if it's fully accurate:

* Object rotations (yaw-angle is known to be accurate)

Large amounts of important information are defined solely in the base canvases (`*.map` files) and not in the map variant. Reading map files (as opposed to map variant files) would be a colossal endeavor, not least because AFAIK game patches often change the format and the game doesn't seem to support loading older-format data (what with mod authors having to basically "recompile" their maps with each game update). So instead, where this tool requires data from base canvases, that specific data has been exported to XML using the game's official modding tools, and this tool just reads those XML files.

Disclaimer: Most of the code for reading bitpacked data and map variants is very old (some of it was originally used to prototype ReachVariantTool, and my first investigation into map variants dates back years) and probably not up to my current standards of quality.

Disclaimer: As of this writing, the rest of this project is something I quickly threw together in a couple days, in order to help out someone who was working on something interesting involving game preservation. I spent a couple more days digging into things like object rotations and some of the properties I hadn't decoded yet at the time. Expect this repo to be pretty rough in quality.


## Licensing info

This project incorporates the [pako](https://github.com/nodeca/pako) library for handling zlib (de)compression in JavaScript (necessary for the Forge label string table). Said library is MIT-licensed.


## Current features

* Table showing the map metadata
* Overhead view of all object positions (indicated by dots)
  * If the data is available, the base canvas's built-in named locations will be drawn, making it easier to discern the map's shape and tell roughly where objects have been placed on it
  * Objects with cylindrical or spherical shapes have those shapes drawn (in the former case, on the blind assumption that the objects aren't rotated)
  * Map can be zoomed using a slider
* Table listing all placed placed objects and some of their properties
  * Clicking on a table row selects that object: its dot on the map will turn red
* Buttons to filter the tableview
  * By map palette category
  * By trait (e.g. "require Forge label")


## How to use

Dump it onto a local web server and load `index.html`. Upload a map variant file using the file uploader at the top. The whole thing runs in-browser.

The `filter.html` file exists as a favor for someone else, who's trying to find a specific map variant from circa 2011 given very little information to go on. (Basically the only visual evidence of it that remains available today is one (1) YouTube video.) It's designed to take several (potentially hundreds) map variants at a time, scan them, and tell you if any of them have the Forge objects (in the appropriate quantities) that the desired map variant is known to have. The search criteria are hardcoded into the script with no UI to adjust them with. I also haven't updated the HTML file since I sent it to them, so I may have ended up making breaking changes to the scripts it relies on.


## How to add map data

Find the map's `scenario` tag in Foundation (part of the Halo: Reach Editing Kit, or HREK, available on Steam). Open the tag and export its contents to XML via the menu bar.

The resulting file is going to be massive. Open it in plain Windows Notepad: it may take twenty to forty seconds but it will work every time. Ctrl + F for the relevant fields (see the XML files we already have) and copy just that data. (Note that when a field is a list, the list `element`s are typically next-siblings of an empty `field` tag.)

Create a new XML file and give it a root node named `data`. Paste the copied data inside of it.

Naming conventions for map data are: `/map-data/<reach-map-ID>/<whatever>.xml`.


## To-do list

### Simple

* Export data for the rest of Reach's multiplayer maps, per the above instructions.
* The table should show Teams as colored dots, with the team name available on mouse over. For Neutral team, show an empty circle.
* The table should show Object Colors similarly to how we wish to show Teams.
* The category filters sohuld be generated based on the canvas's Forge palette. In particular, some maps have unique (typically hidden) palette folders (e.g. Anchor 9 has one for the low-grav volume used for its space area).
* Because we use `:focus` and `focusin` to indicate the selected table row, if the page as a whole loses focus, the table row that you had selected loses all visual indication of being selected.
* When the mouse is over one or more of the map's named locations, we should display the names of all such locations somehow. (Yes, all: locations can overlap, and Forge World has one location that covers the entire map including all other locations.)
* Fix the issue where when you zoom into the map, object shapes are drawn with too thick a line. This is a result of web browsers en masse being stupid about applying `scale` to `border-width` and forcing a minimum border width of 1px pre-scaling. The only solution will be to draw these object shapes using another SVG element rather than using borders on the dots.
  * If custom elements can subclass SVG elements, then we may as well subclass `circle` or something and put the dots inside that SVG too.
    * Firefox, at the least, also mishandles multiple elements scaled in tandem &mdash; from what I've seen, sometimes one of the layers will just *shift* a few pixels at random and I have no idea why the hell this happens &mdash; so drawing everything to a single SVG would probably be best anyway. (I love frontend!)
* It'd be nice if, when you click on a `RACE_FLAG`-labeled object in the table, we could draw an arrow to the next race checkpoints (i.e. the object(s) that share the next-highest spawn sequence; or, if none exist, the object(s) that share the lowest spawn sequence on the map).
* New search features:
  * Require Shape
* Ability to sort the tableview by any column
* Table columns
  * Symmetry

### Intermediate

* Abstract the `MapVariant` string table for Forge labels into a ReachStringTable class.
* Refactor the `MapVariant` class to use my current coding style (snake-case; `Vec3`s for the bounding box corners; etc.).
* The object dots that we render should be able to pull their metadata directly from the Forge objects in the `MapVariant`, rather than copying it over (i.e. we should be keeping that data in an "ideal" and easily-queried format within `MapVariant` rather than translating it en route to the UI).
* The category filters should use SVG icons with hovertext, rather than full names.

### Advanced

* Currently I use a custom `DevtoolsFormatter` class to be able to customize how objects display in Firefox's devtools. (Despite its size, the class doesn't offer a lot of functionality: the relevant APIs are such that if you want to make even the tiniest tweak to how objects are debugged, you basically have to rebuild the entire object debugger.) It'd be nice if it were possible to load, say, a Natvis XML file and use that to guide browser devtools behavior. You know &mdash; an actually sane form of this kind of customization.

* Obviously the *very* most advanced thing we could try to do with this is extract Reach's models, simplify the hell out of them to erase most details, and then make a basic 3D map viewer. (The simplification step would be akin to Wikipedia only using low-resolution images of copyrighted content: a way to stay fair-use by ensuring that the models we embed into the map viewer can't ever actually be a substitute for the real thing.)
  * I suppose an even more advanced thing to do would be to make a full-on editor...
    * No. *NO.* Not until DovahKit is *well into* its planned sustain phases.