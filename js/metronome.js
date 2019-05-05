const NOTE_LENGTH   = 0.01; // length of "click" (in seconds)
const CANVAS_WIDTH  = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const SCHEDULE_AHEAD_TIME = 0.1; // How far ahead to schedule audio (seconds)
                                // This overlaps with the next interval (in case the timer is late)

class Metronome {
    constructor() {
        // Audio setup
        this.audioCtx        = new AudioContext();
        this.isPlaying       = false;
        this.current16thNote = 0;     // What note is last scheduled?
        this.tempo           = 120.0; // Tempo (in beats per minute)
        this.lookahead       = 0.025; // How frequently to call the scheduling function
        this.nextNoteTime    = 0;    // when the next note is due.
        this.noteResolution  = 0;     // 0 = 16th, 1 = 8th, 2 = quarter note
        this.notesInQueue    = [];    // the notes that have been put into the web audio,
                                      // and may or may not have played yet. {note, time}
        
        // Visuals setup        
        const canvas  = document.createElement('canvas');
        canvas.width  = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        document.body.appendChild(canvas);

        this.canvasContext             = canvas.getContext('2d');
        this.canvasContext.strokeStyle = "#ffffff";
        this.canvasContext.lineWidth   = 2;
        
        this.last16thNoteDrawn = -1; // the last "box" we drew on the screen
        
        // Event handlers setup
        document.querySelector('#play').onclick = e => {
            this.play();
            e.target.innerText = this.isPlaying ? 'Stop' : 'Play';
        }

        document.querySelector('#tempoBox').oninput = event => {
            this.tempo = event.target.value;
            document.getElementById('showTempo').innerText = this.tempo;
        }

        document.querySelector('#noteResolution').onchange = event => {
            this.noteResolution = event.target.selectedIndex;
        }

        // Start the animation
        const animationFrameCallback = () => {
            this.draw();
            this.timer();
            requestAnimationFrame(animationFrameCallback);
        }

        animationFrameCallback();
    }
    
    get time() {
        return this.audioCtx.currentTime;
    }

    nextNote() {
        // Advance current note and time by a 16th note
        const secondsPerBeat = 60.0 / this.tempo;               // Do this here so it picks up the CURRENT tempo value to calculate beat length.
        this.nextNoteTime   += 0.25 * secondsPerBeat;           // Add beat length to next note time. 0.25 because we're in 4/4 and each beat is a quarter note
        this.current16thNote = (this.current16thNote + 1) % 16; // Advance the beat number, wrap to zero
    }
 
    scheduler() {
        // While there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        while (this.nextNoteTime < this.time + SCHEDULE_AHEAD_TIME) {
            // Push the note on the queue, even if we're not playing.
            this.notesInQueue.push({ note: this.current16thNote, time: this.nextNoteTime });
        
            this.nextNote();
            if ((this.noteResolution === 1) && (this.current16thNote % 2 !== 0) || ((this.noteResolution === 2) && (this.current16thNote % 4 !== 0))) {
                return; // We're not playing non-8th 16th notes or non-quarter 8th notes
            }
        
            // create an oscillator
            const osc = this.audioCtx.createOscillator();
            osc.connect(this.audioCtx.destination);

            osc.frequency.value = 220.0;      // Low pitch is the default, change it for 'special' beats
            if (this.current16thNote === 0) { // Beat 0 = high pitch
                osc.frequency.value = 880.0;
            }
            else if (this.current16thNote % 4 === 0) { // Quarter notes = medium pitch
                osc.frequency.value = 440.0;
            }
        
            osc.start(this.nextNoteTime);
            osc.stop(this.nextNoteTime + NOTE_LENGTH);
        }
    }
    
    play() {
        this.isPlaying = !this.isPlaying;

        if (!this.isPlaying) {
            return;
        }
    
        // We've started playing, so initialize these values
        this.current16thNote = 0;
        this.nextNoteTime    = this.time;
        this.timerLastCalled = this.time;
    }
    
    draw() {
        let currentNote = this.last16thNoteDrawn;
        while (this.notesInQueue.length && this.notesInQueue[0].time < this.time) {
            currentNote = this.notesInQueue[0].note;
            this.notesInQueue.shift(); // Remove note from the queue
        }
        
        // We only need to draw if the note has moved.
        if (this.last16thNoteDrawn === currentNote) {
            return;
        }

        this.last16thNoteDrawn = currentNote;

        let x = Math.floor(CANVAS_WIDTH / 18);
        this.canvasContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); 
        for (let i = 0; i < 16; i++) {
            this.canvasContext.fillStyle = (currentNote === i)
                ? (currentNote % 4 === 0) ? "red" : "blue" 
                : "black";
            this.canvasContext.fillRect(x * (i+1), x, x/2, x/2);
        }
    }

    // Checks the current time and fires a callback on sixteenth notes
    timer() {
        const time = this.time;
        if (time - this.timerLastCalled < this.lookahead) {
            // It's not time to schedule a note yet
            return;
        }

        this.timerLastCalled = this.time;
        if (this.isPlaying) {
            this.scheduler();
        }
    }
}

new Metronome();
