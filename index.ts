import { TpaServer, TpaSession } from '@augmentos/sdk';
import axios from 'axios';

// API key for Meshy text-to-3D API
const MESHY_API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key

/**
 * Shows a sequence of loading messages
 * @param session The TPA session
 * @param durationMs Total duration to show messages
 * @returns A promise that resolves when all messages are shown
 */
const showLoadingMessages = (session: TpaSession, durationMs: number = 5000): Promise<void> => {
  return new Promise((resolve) => {
    const messages = [
      "STARTING 3D MODEL CREATION...",
      "GENERATING YOUR MODEL...",
      "ALMOST THERE...",
      "FINALIZING YOUR CREATION..."
    ];
    
    let index = 0;
    const messageTime = durationMs / messages.length;
    
    // Show first message immediately
    session.layouts.showTextWall(messages[0], { durationMs: messageTime + 500 });
    
    // Show subsequent messages
    const interval = setInterval(() => {
      index++;
      if (index < messages.length) {
        session.layouts.showTextWall(messages[index], { durationMs: messageTime + 500 });
      } else {
        clearInterval(interval);
      }
    }, messageTime);
    
    // Resolve after full duration
    setTimeout(resolve, durationMs);
  });
};

/**
 * Shows a simple three-dot loading animation
 * @param session The TPA session
 * @param durationMs How long to show the animation
 * @returns A promise that resolves when the animation is done
 */
const showThreeDotsAnimation = (session: TpaSession, durationMs: number = 10000): Promise<void> => {
  return new Promise((resolve) => {
    const frames = [
      ".",
      "..",
      "..."
    ];
    
    let index = 0;
    const intervalMs = 600; // Update every 600ms for better visibility
    
    // Start the animation
    const interval = setInterval(() => {
      session.layouts.showTextWall(frames[index % frames.length], {
        durationMs: intervalMs + 100 // Slightly longer than interval to avoid flicker
      });
      index++;
    }, intervalMs);
    
    // Stop the animation after the specified duration
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, durationMs);
  });
};

/**
 * Sends a request to the Meshy text-to-3D API to generate a 3D model from text
 * @param command The command to turn into a 3D model
 */
const threeDPrintIt = async (command: string) => {
  console.log(`Sending to 3D API: "${command}"`);
  
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
          let handledSpecialCommand = false;
          
          // Check if we're waiting for confirmation
          if (this.awaitingConfirmation) {
            // Check for yes/no response
            if (lowerText.includes('yes') || lowerText.includes('yeah') || lowerText.includes('correct')) {
              // User confirmed, execute the command
              session.layouts.showTextWall(`Executing: ${this.pendingCommand}`, {
                durationMs: 2000
              });
              
              // Show spinner while processing
              const command = this.pendingCommand;
              
              // Reset confirmation state immediately
              this.awaitingConfirmation = false;
              this.pendingCommand = '';
              handledSpecialCommand = true;
              
              // Show three-dot animation and then call API
              showThreeDotsAnimation(session, 10000).then(() => {
                // Call the 3D print function with API integration
                threeDPrintIt(command)
                  .then(result => {
                    session.layouts.showTextWall(`3D model created successfully!`, {
                      durationMs: 5000
                    });
                  })
                  .catch(err => {
                    session.layouts.showTextWall(`Failed to create 3D model. Please try again.`, {
                      durationMs: 5000
                    });
                  });
              });
            } 
            else if (lowerText.includes('no') || lowerText.includes('nope') || lowerText.includes('cancel')) {
              // User rejected, go back to original prompt
              session.layouts.showTextWall("Command cancelled. What would you like to create?", {
                durationMs: 3000
              });
              
              // Reset confirmation state
              this.awaitingConfirmation = false;
              this.pendingCommand = '';
              handledSpecialCommand = true;
            }
            else {
              // If neither yes nor no, continue waiting for confirmation
              session.layouts.showTextWall(`Please confirm: "${this.pendingCommand}" - Say yes or no`, {
                durationMs: 5000
              });
              // Don't mark as handled so we still show the transcription
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
              handledSpecialCommand = true;
            }
          }

          // Always display the transcribed text unless we handled a special command
          if (!handledSpecialCommand) {
            session.layouts.showTextWall(data.text, {
              durationMs: 3000
            });
          }

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
  augmentOSWebsocketUrl: 'wss://dev.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);

