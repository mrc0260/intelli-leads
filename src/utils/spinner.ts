export class Spinner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private message: string;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;

  constructor(message: string) {
    this.message = message;
  }

  updateMessage(newMessage: string) {
    this.message = newMessage;
  }

  start() {
    // Hide cursor
    process.stdout.write('\x1B[?25l');
    this.timer = setInterval(() => {
      // Clear line, move to start
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`\x1b[36m${this.frames[this.currentFrame]}\x1b[0m ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  /** Logs a permanent message above the spinner without breaking the animation. */
  logAbove(logMessage: string) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(logMessage);
    // Immediately redraw spinner so it doesn't blink
    process.stdout.write(`\x1b[36m${this.frames[this.currentFrame]}\x1b[0m ${this.message}`);
  }

  stop(successMessage?: string) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Clear line, move to start, show cursor
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write('\x1B[?25h');
    
    if (successMessage) {
      console.log(`✅ ${successMessage}`);
    } else {
      console.log();
    }
  }
}

// Ensure cursor is restored if the user forcefully exits (Ctrl+C)
process.on('SIGINT', () => {
  process.stdout.write('\x1B[?25h');
  process.exit(0);
});
