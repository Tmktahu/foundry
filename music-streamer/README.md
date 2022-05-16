# Foundry VTT Music Streamer

This is a simple module that adds a small HTML audio player (https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement/Audio) meant specifically for playing an audio stream.

The module has a play button, a stop button, a volume slider, and a settings button that reveals a text field where you can change the URL of the audio stream.
If the GM of the game updates the stream URL, then it is also updated for all users.

To install, use this manifest URL: `https://raw.githubusercontent.com/Tmktahu/foundry/master/music-streamer/music-streamer/module.json`

<img src="https://i.imgur.com/DQb1S8N.png" style="width: 300px">

## Why is this useful?

Personally, I find Foundry's audio tooling clunky when trying to play specific tracks at specific times at specific volumes. It's great for ambient play-and-forget music, but not so much for planned tracks I play during cutscenes or events. So I prefer to use my own music player on my computer and coded this to let me do that.

## How do you use it?

The basic idea is you connect your local audio player to a music streaming server and then access that music stream via an audio stream URL. There are a good number of tools and setups to accomplish this. My prefered setup uses Winamp and SHOUTcast which looks like:

> Winamp Player w/ SHOUTcast Source DSP v2.3.5 plugin **==>** SHOUTcast DNAS v2.5 Server run locally **==>** Foundry audio player

The module here is merely an audio player. Most of your setup will be getting the audio streaming server up and running. It'll involve some configuration of the streaming server, some port forwarding, and some configuration of your music player. Then once everything is up and running you can stick the music stream URL (in my case it's my global IP address on port 8000) into the Foundry audio player.

