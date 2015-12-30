# EMU-webApp

[![Build Status](https://travis-ci.org/IPS-LMU/EMU-webApp.png)](https://travis-ci.org/IPS-LMU/EMU-webApp)
[![Coverage Status](https://img.shields.io/coveralls/IPS-LMU/EMU-webApp.svg)](https://coveralls.io/r/IPS-LMU/EMU-webApp)

The EMU-webApp is an online and offline web application for labeling, visualizing and correcting speech and derived speech data. To get an idea of what it looks like please visit [this URL](http://ips-lmu.github.io/EMU-webApp/). General information about the next iteration of the EMU speech database management system can be found [here](http://ips-lmu.github.io/EMU.html).


## Quick start

Visit [this URL](http://ips-lmu.github.io/EMU-webApp/) and click the `open demo DB` button in the top menu to load one of the three small example databases.

## Tools for development

* install [nodejs and npm](http://nodejs.org/)
* install `bower` with `npm install -g bower`
* install `grunt` with `npm install -g grunt`
* install `compass` and `sass` with `gem install sass` and `gem install compass`
* clone this repo with `git clone https://github.com/IPS-LMU/EMU-webApp.git`
* navigate to the freshly cloned repo (the folder is usually named `EMU-webApp`) and install dependencies with the commands `bower install` and `npm install`, then navigate to the subfolder `app` and run another `npm install`
* run static file server at `http://localhost:9000`  with `grunt serve`
* for livereload use the `livereload` browser plugin
* a small websocket data provider server can be found under `exampleServers/nodeEmuProtocolWsServer.js`

If `grunt serve` is not working make sure to install the latest dependencies by

* updating `bower` by rerunning `bower install`
* updating `npm` by rerunning `npm install`
* updating `sass` and compass by running `gem update sass` and `gem update compass`

## Tests
* unit: run `grunt test`
* protractor: run `grunt e2e`

## Main authors

**Raphael Winkelmann**

+ [github](http://github.com/raphywink)

**Georg Raess**

+ [github](http://github.com/georgraess)

**Markus Jochim**

+ [github](http://github.com/MJochim)

**Affiliations**

[INSTITUTE OF PHONETICS AND SPEECH PROCESSING](http://www.en.phonetik.uni-muenchen.de/)
