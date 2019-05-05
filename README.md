# ES2015 Web Audio Metronome

This project is a fork of https://github.com/cwilso/metronome, updated to take advantage of ES2015's features. 
It shows how to use a combination of requestAnimationFrame and the Webaudio scheduler to achieve stable audio timing.

# Motivation

I'd been working on a project which incorporated a metronome but had been having trouble getting the audio scheduling to work correctly. 
I found the original project, but it hadn't received significant updates in some time and had been initially developed in late 2012, so I 
had some difficulty following the code. I've refactored it to take advantage of the features offered by ES2015.

I figured the best way to understand it was to take it apart and try to rewrite it so that it looked more familiar to me. 
The basic approach remains the same, but I've changed several things. Most notably, I've rewritten metronome.js so that it's a class. 
I've also removed an external dependency, the Webworker timer, and cross-browser support/polyfills, along with updating and adding comments.

I hope you find it useful. Please feel free to fork, submit issues/requests, etc.

-Joel