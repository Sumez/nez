# nez
This is a web based NES emulator.

# Setup

## Using PHP (apache/nginx/etc configured properly)

Just dump this entire directory on your webserver. That's it; you're done! 

## Using plain html (for s3, github sites, etc...)

This project relies on PHP to put a lot of the code for the project together, however sometimes you just want to dump
files on a static file server. We can manually run PHP to do this for us. The only lost functionality is debug
information. 

This is automatically done on each build to create the `dist` directory, which you can host on any static file server.
Please do not change the `dist` directory manually, or your changes will be overwritten.

If you'd like to do this yourself, you can run either `build_dist.sh` (Linux and Mac) or `build_dist.bat` (Windows) - 
this script requires that you have PHP installed and on your path. 

## cppchriscpp Note

This repository is where I'll do some hacking on this for my own projects. All changes are available under GPL,
(same license as the original project) and I'll try to contribute any useful code back to the original project,
as required. 

**My hacks will be in the `hackery` branch. master will be kept up to date with the `Sumez/nez` `master` branch.**