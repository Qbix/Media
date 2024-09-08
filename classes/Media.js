"use strict";
/*jshint node:true */
/**
 * Media plugin
 * @module Media
 * @main Media
 */
var Q = require('Q');

/**
 * Static methods for the Media model
 * @class Media
 * @extends Base.Media
 * @static
 */
function Media() { }
Media.WebRTC = require('Media/WebRTC');
Media.RTMPMediaServer = require('RTMPMediaServer');
module.exports = Media;

