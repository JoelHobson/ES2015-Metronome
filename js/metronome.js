const NOTELENGTH = 0.01;      // length of "beep" (in seconds)

// timerWorker enum
const START = 'start';
const STOP  = 'stop';
const PLAY  = 'play';
const TICK  = 'tick';

class Metronome {
    constructor() {
        // Audio setup
        this.audioCtx = new AudioContext();
        this.isPlaying = false;
        this.current16thNote = 0;     // What note is currently last scheduled?
        this.tempo = 120.0; // Tempo (in beats per minute)
        this.lookahead = 25.0;  // How frequently to call scheduling function (in ms)
        this.notesInQueue = [];    // the notes that have been put into the web audio,
        // and may or may not have played yet. {note, time}
        
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
        // This is calculated from lookahead, and overlaps 
        // with next interval (in case the timer is late)
        
        this.nextNoteTime = 0.0; // when the next note is due.
        this.noteResolution = 0;   // 0 = 16th, 1 = 8th, 2 = quarter note

        // Visuals setup 
        this.canvas = document.createElement('canvas');
        this.canvasContext = this.canvas.getContext('2d');
        this.last16thNoteDrawn = -1; // the last "box" we drew on the screen
        
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.canvasContext.strokeStyle = "#ffffff";
        this.canvasContext.lineWidth = 2;
        
        const container = document.createElement('div');
        container.className = "container";
        document.body.appendChild(container);
        container.appendChild(this.canvas);
        
        // Event handlers setup
        document.querySelector('#play').onclick = e => {
            this.play();
            e.target.innerText = this.isPlaying ? STOP : PLAY;
        }

        document.querySelector('#tempoBox').oninput = event => {
            this.tempo = event.target.value;
            document.getElementById('showTempo').innerText = this.tempo;
        }

        document.querySelector('#noteResolution').onchange = event => {
            this.noteResolution = event.target.selectedIndex;
        }

        // Timer setup
        this.timerWorker = new Worker("js/metronomeworker.js");// The Web Worker used to fire timer messages
        this.timerWorker.onmessage = e => {
            if (e.data === TICK) {
                this.scheduler();
            };
        };
            
        requestAnimationFrame(() => this.draw());    // start the drawing loop and the timer.
        this.timerWorker.postMessage({ "interval": this.lookahead });
    }
    
    get time() {
        return this.audioCtx.currentTime;
    }

    nextNote() {
        // Advance current note and time by a 16th note
        const secondsPerBeat = 60.0 / this.tempo;               // Do this here so it picks up the CURRENT tempo value to calculate beat length.
        this.nextNoteTime += 0.25 * secondsPerBeat;           // Add beat length to last beat time. 0.25 because we're in 4/4 and each beat is a quarter note
        this.current16thNote = (this.current16thNote + 1) % 16; // Advance the beat number, wrap to zero
    }
    
    scheduleNote(beatNumber, time) {
        // Push the note on the queue, even if we're not playing.
        this.notesInQueue.push({ note: beatNumber, time: time });
    
        if (this.noteResolution === 1 && beatNumber % 2 || this.noteResolution === 2 && beatNumber % 4) {
            return; // We're not playing non-8th 16th notes or non-quarter 8th notes
        }
    
        this.playSoundAt(beatNumber, time);
    }
    
    playSoundAt(beatNumber, time) {
        // create an oscillator
        const osc = this.audioCtx.createOscillator();
        osc.connect(this.audioCtx.destination);

        osc.frequency.value = 220.0; // Low pitch is the default, change it for 'special' beats
        if (beatNumber === 0) {    // Beat 0 = high pitch
            osc.frequency.value = 880.0;
        }
        else if (beatNumber % 4 === 0) { // Quarter notes = medium pitch
            osc.frequency.value = 440.0;
        }
    
        osc.start(time);
        osc.stop(time + NOTELENGTH);
    }
    
    scheduler() {
        // while there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        while (this.nextNoteTime < this.time + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }
    }
    
    play() {
        this.isPlaying = !this.isPlaying;
    
        if (this.isPlaying) { // start playing
            this.current16thNote = 0;
            this.nextNoteTime = this.time;
            this.timerWorker.postMessage(START);
            return;
        }
        
        this.timerWorker.postMessage(STOP);
    }
    
    draw() {
        let currentNote = this.last16thNoteDrawn;
        let currentTime = this.time;
    
        while (this.notesInQueue.length && this.notesInQueue[0].time < currentTime) {
            currentNote = this.notesInQueue[0].note;
            this.notesInQueue.splice(0,1);   // remove note from queue
        }
    
        // We only need to draw if the note has moved.
        if (this.last16thNoteDrawn !== currentNote) {
            let x = Math.floor(this.canvas.width / 18 );
            this.canvasContext.clearRect(0,0,this.canvas.width, this.canvas.height); 
            for (let i = 0; i < 16; i++) {
                this.canvasContext.fillStyle = (currentNote === i)
                    ? (currentNote % 4 === 0) ? "red" : "blue" 
                    : "black";
                this.canvasContext.fillRect(x * (i+1), x, x/2, x/2);
            }
            this.last16thNoteDrawn = currentNote;
        }
    
        // set up to draw again
        requestAnimationFrame(() => this.draw());
    }
}

new Metronome();
