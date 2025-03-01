import { TpaServer, TpaSession } from '@augmentos/sdk';

/**
 * Simulates a 3D printing request
 * @param command The command to 3D print
 */
const threeDPrintIt = (command: string) => {
  console.log(`3D PRINTING: "${command}"`);
};

class ExampleAugmentOSApp extends TpaServer {
  // Track state
  private lastTranscriptionTime: number = 0;
  private awaitingConfirmation: boolean = false;
  private pendingCommand: string = '';

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Example Captions App Ready!");

    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {
        const magicWord = "creator";
        const currentTime = Date.now();
        
        // Update last transcription time
        this.lastTranscriptionTime = currentTime;

        // Process final transcriptions
        if (data.isFinal) {
          const lowerText = data.text.toLowerCase();
          
          // Check if we're waiting for confirmation
          if (this.awaitingConfirmation) {
            // Check for yes/no response
            if (lowerText.includes('yes') || lowerText.includes('yeah') || lowerText.includes('correct')) {
              // User confirmed, execute the command
              session.layouts.showTextWall(`Executing: ${this.pendingCommand}`, {
                durationMs: 3000
              });
              
              // Call the 3D print function
              threeDPrintIt(this.pendingCommand);
              
              // Reset confirmation state
              this.awaitingConfirmation = false;
              this.pendingCommand = '';
            } 
            else if (lowerText.includes('no') || lowerText.includes('nope') || lowerText.includes('cancel')) {
              // User rejected, go back to original prompt
              session.layouts.showTextWall("Command cancelled. What would you like to create?", {
                durationMs: 3000
              });
              
              // Reset confirmation state
              this.awaitingConfirmation = false;
              this.pendingCommand = '';
            }
            else {
              // If neither yes nor no, continue waiting for confirmation
              session.layouts.showTextWall(`Please confirm: "${this.pendingCommand}" - Say yes or no`, {
                durationMs: 5000
              });
            }
          }
          // Not awaiting confirmation, check for magic word
          else if (lowerText.includes(magicWord)) {
            // Get everything after "creator"
            const index = lowerText.indexOf(magicWord) + magicWord.length;
            const command = data.text.slice(index).trim();
            
            if (command) {
              console.log('Command captured:', command);
              
              // Store the command and enter confirmation mode
              this.pendingCommand = command;
              this.awaitingConfirmation = true;
              
              // Ask for confirmation
              session.layouts.showTextWall(`Do you want me to create: "${command}"? Say yes or no.`, {
                durationMs: 7000
              });
            }
          }

          // Display the transcribed text (original transcription)
          session.layouts.showTextWall(data.text, {
            durationMs: 3000
          });

          // Log transcription for debugging
          console.log('Final transcription:', data.text);
        } else {
          // For non-final transcriptions, just show them
          session.layouts.showTextWall(data.text);
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