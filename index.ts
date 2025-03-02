import { TpaServer, TpaSession } from '@augmentos/sdk';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// API key for Meshy text-to-3D API
const MESHY_API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key

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
  
  // Placeholder for API call - uncomment when ready to use
  /*
  const headers = { Authorization: `Bearer ${MESHY_API_KEY}` };
  const payload = {
    mode: 'preview',
    prompt: command,
    art_style: 'realistic',
    should_remesh: true
  };
  
  try {
    const response = await axios.post(
      'https://api.meshy.ai/openapi/v2/text-to-3d',
      payload,
      { headers }
    );
    console.log('3D model generated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error generating 3D model:', error);
    throw error;
  }
  */
  
  // For testing, just return a success after a delay
  return new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000));
};

class AugmentOSApp extends TpaServer {
  // Track state
  private lastTranscriptionTime: number = 0;
  private awaitingConfirmation: boolean = false;
  private pendingCommand: string = '';
  private imageBase64: string = '';

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
    }
  }

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show image immediately at startup
    if (this.imageBase64) {
      // Display the image without duration parameter
      session.layouts.showBitmapView(this.imageBase64);
      
      // Set timeout to show welcome message after image has been displayed for 5 seconds
      setTimeout(() => {
        session.layouts.showTextWall("Welcome to AugmentOS!");
      }, 5000);  // 5000ms = 5 seconds
    } else {
      session.layouts.showTextWall("Welcome to AugmentOS!");
    }

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
              
              // Store command and reset state before async operations
              const command = this.pendingCommand;
              this.awaitingConfirmation = false;
              this.pendingCommand = '';
              handledSpecialCommand = true;
              
              // Show loading animation then call API
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
const app = new AugmentOSApp({
  packageName: 'org.example.creator', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, play nice
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://dev.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);

