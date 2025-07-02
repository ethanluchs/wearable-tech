import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export class SlidesAPI {
    private oauth2Client: OAuth2Client;
    private slides: any;
    private presentationId?: string;
    
    constructor() {
        this.oauth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
        
        this.slides = google.slides({ version: 'v1', auth: this.oauth2Client });
    }
    
    getAuthUrl(): string {
        const scopes = ['https://www.googleapis.com/auth/presentations'];
        
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });
    }
    
    async authenticateWithCode(code: string) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }
    
    async loadPresentation(presentationId: string) {
        this.presentationId = presentationId;
        
        try {
            const presentation = await this.slides.presentations.get({
                presentationId: presentationId
            });
            
            return {
                id: presentationId,
                title: presentation.data.title,
                slideCount: presentation.data.slides?.length || 0
            };
        } catch (error) {
            throw new Error(`Failed to load presentation: ${error}`);
        }
    }
    
    async navigateToSlide(slideIndex: number) {
        // Google Slides API doesn't directly control navigation in presentation mode
        // We'll implement this differently
        console.log(`Would navigate to slide ${slideIndex}`);
        return { success: true, slideIndex };
    }
}