import { TpaServer, TpaSession } from '@augmentos/sdk';

class ExampleAugmentOSApp extends TpaServer {
  private lastTranscriptionTime: number = 0;
  private currentCommand: string = '';
  private isCollecting: boolean = false;

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Example Captions App Ready!");

    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {
        const triggerPhrase = "hey creator";
        const currentTime = Date.now();
        
        // If there's been more than 1 second since last transcription and we were collecting
        if (this.isCollecting && currentTime - this.lastTranscriptionTime > 500) {
          console.log('Command captured after pause:', this.currentCommand);
          const res = this.currentCommand;
          // Simply display the command text
          session.layouts.showTextWall(this.currentCommand, {
            durationMs: 5000
          });
          // Reset collection state
          this.isCollecting = false;
          this.currentCommand = '';
        }

        // Update last transcription time
        this.lastTranscriptionTime = currentTime;

        // Check for trigger phrase and start collecting
        if (data.isFinal) {
          if (data.text.toLowerCase().startsWith(triggerPhrase)) {
            this.isCollecting = true;
            this.currentCommand = data.text.slice(triggerPhrase.length).trim();
          } else if (this.isCollecting) {
            // Append new transcription to current command
            this.currentCommand += ' ' + data.text;
          }
        }

        // Display the transcribed text
        session.layouts.showTextWall(data.text, {
          durationMs: data.isFinal ? 5000 : undefined
        });

        // Log transcription for debugging
        if (data.isFinal) {
          console.log('Final transcription:', data.text);
        }
      }),

      session.events.onPhoneNotifications((data) => {}),

      session.events.onGlassesBattery((data) => {}),

      session.events.onError((error) => {
        console.error('Error:', error);
      })
    ];

    // Add cleanup handlers
    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
}

// Start the server
// DEV CONSOLE URL: https://augmentos.dev/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleAugmentOSApp({
  packageName: 'org.example.creator', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, play nice
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://staging.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);