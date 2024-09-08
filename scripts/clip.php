#!/usr/bin/env php
<?php
/**
 * Create Media/clip stream and relate to feed
 */

$FROM_APP = defined('RUNNING_FROM_APP'); //Are we running from app or framework?

#Arguments
$argv = $_SERVER['argv'];
$count = count($argv);

if(!$FROM_APP) {
	die('<app_root> must be a path to the application root directory'.PHP_EOL);
}

$help = <<<EOT
Options:

-video Video file path

-image Image thumbnail file path

-communityId Feed stream publisher id

-feedId Last path of feed stream name

-duration Video duration in milliseconds
EOT;

if (isset($argv[1]) and in_array($argv[1], array('--help', '/?', '-h', '-?', '/h'))) {
	die($help);
}

if (!isset($params)) {
	$params = array(
		"video" => null,
		"image" => null,
		"publisherId" => null,
		"feedId" => null,
		"duration" => null
	);
}

foreach ($argv as $value) {
	foreach ($params as $key => $v) {
		$kkey = "-".$key."=";
		if (substr($value, 0, strlen($kkey)) == $kkey) {
			$params[$key] = substr($value, strlen($kkey));
		}
	}
}

Media::createClip($params);

echo $stream->name;