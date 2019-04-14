# Nez
This is a web based NES emulator. It has been forked from 
<a href="https://github.com/sumez">Sumez</a>'s 
<a href="https://github.com/sumez/nez">Nez emulator</a> to support a few new features, and also to make it as easy 
as possible for individual developers to create a web-facing emulator for their games.

# Setting up the emulator

You have a number of options for setting up the emulator. Pick whichever one is easiest for you!

## Setting it up using PHP

 Copy all of the files from the repository to your webserver. That's it; you're done! 
 
 (Note: You can get the files by using the "Download Zip" option on the repository.)

## Setting it up using plain html (Suitable for most web hosts, including amazon s3)

If you don't have (or want) PHP support, you can set the emulator up without it.

Instead of copying all files from the repository to your server, open the `dist` 
folder. Copy all of the files from the `dist` folder to your web server. 

## Setting it up using github pages

If you fork this version of `Nez`, you will be able to turn on Github pages, and use this to play your game. You will 
have to modify the url that github gives you slightly to add the `dist` directory. 

So if github shows you `https://yourname.github.io/nez/`, you will actually need to go to 
`https://yourname.github.io/nez/dist/`instead. 

Similarly, you will need to update the `config.js` file in the `dist` folder.

# Setting Nez up to automatically play your game

Once you have set up Nez hosted somewhere, you can set it up to start your game automatically!

All you need to do is edit a configuration file called `config.js` - it should be in the same folder as `index.php` or
`index.html`. (Whichever one you set up above) 

There is a setting called `game` which you can point to rom file to load. There are a few ways you can set it.

## Hosting the rom with the emulator

The easiest way to get things running is to copy your rom to the same folder as `index.php` or `index.html`. After you
do this, you just need to update `config.js` to point to this file, which you can do like this:

```javascript
    game: "my_game.nes",
```

## Hosting the rom somewhere else

If you want to play a game that is hosted on another server, you can also provide a full url to the rom. 

<strong>NOTE</strong>: The server hosting the rom must be properly set up with CORS headers. If this is not done, the
rom will not load, and there will be an error in the javascript console.

Once you have the url to the game, update `config.js` with your rom's url:

```javascript
    game: "https://my-site.com/folder/rom.nes",
```

# Embedding Nez on another website

Nez can be embedded into websites, allowing people to play your game right on the site! 

The easiest way to do this is with an iframe. There is a special file called `index_embed.html` or `index_embed.php`,
which is built to support this. If you open it in your browser, you will see the emulator on a plain black page.

You will want to size the iframe carefully (using css) to make sure the game looks right. The emulator can scale 
to a few sizes - the most popular one is `512px` by `480px`. 

# Adding a description of the game

Nez allows you to show some information about the game below the emulator. To do
this, update `config.js`. There are two variables you need to tweak: 

```javascript
    // Set this to a text string to show a description about your game (not shown in embedded view)
    // This will show up between the controls and the emulator description. Html is supported!
    // IMPORTANT: If you set this, be sure to set the title below too!
    gameDescription: "This is a game about doing stuff. You do stuff, and you do things. At the end, the things are done. Learn more <a href=\"http://mywebsite.com\">here</a>.",

    // Set this to the title of your game, and it will show up instead of the words "This Game" in the description area.
    gameTitle: "My Game",
```

This should result in something like this:

![game description](./docs/about_game.png)

# It doesn't work! Help!

If you're having trouble, feel free to either open a github issue, or 
[contact me on twitter](https://twitter.com/cppchriscpp)!

# Advanced Stuff

## Building the `dist` folder manually

The `dist` folder is automatically re-generated on the `hackery` branch with every commit, so you should not ever need
to do this, unless you are working with it locally.

If you want to rebuild the `dist` directory, you can run either `build_dist.sh` (Linux and Mac) or 
`build_dist.bat` (Windows) - this script requires that you have PHP installed and on your path. 

**My hacks will be in the `hackery` branch. master will be kept up to date with the `Sumez/nez` `master` branch.**