import { TpaServer, TpaSession } from '@augmentos/sdk';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// API key for Meshy text-to-3D API
const MESHY_API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key

/**
 * Sends a request to the Meshy text-to-3D API to generate a 3D model from text
 * @param command The command to turn into a 3D model
 */
const threeDPrintIt = async (command: string) => {
  console.log(`Sending to 3D API: "${command}"`);
  
};

class AugmentOSApp extends TpaServer {
  // Track state
  private lastTranscriptionTime: number = 0;
  private awaitingConfirmation: boolean = false;
  private pendingCommand: string = '';
  private imageBase64: string;

  constructor(config: any) {
    super(config);

    // Read and encode the image in constructor
    try {
      const imagePath = path.join(__dirname, 'test.bmp');
      const imageBuffer = fs.readFileSync(imagePath);
      this.imageBase64 = imageBuffer.toString('base64');
      console.log('Image encoded successfully');
    } catch (error) {
      console.error('Error reading or encoding image:', error);
      this.imageBase64 = '';
    }
  }

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show image immediately for 5 seconds
    session.layouts.showBitmapView(this.imageBase64);
    setTimeout(() => {
      session.layouts.showTextWall("Welcome to AugmentOS!");
    }, 5000);  // 5000ms = 5 seconds

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
                durationMs: 3000
              });
              
              // Call the 3D print function with API integration
              threeDPrintIt(this.pendingCommand)
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
              
              // Reset confirmation state
              this.awaitingConfirmation = false;
              this.pendingCommand = '';
              handledSpecialCommand = true;
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
const app = new AugmentOSApp({
  packageName: 'org.example.creator', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, play nice
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://dev.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);

