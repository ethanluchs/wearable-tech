import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export class SlidesAPI {
    private oauth2Client: OAuth2Client;
    private slides: any;
    private drive: any;
    private presentationId?: string;
    private isAuthenticated: boolean = false;

    constructor() {
        // Validate environment variables
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
            throw new Error('Missing required Google OAuth environment variables');
        }

        this.oauth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        this.slides = google.slides({ version: 'v1', auth: this.oauth2Client });
        this.drive = google.drive({ version: `v3`, auth: this.oauth2Client });
    }

    getAuthUrl(): string {
        const scopes = [
            'https://www.googleapis.com/auth/presentations',
            'https://www.googleapis.com/auth/presentations.readonly',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.readonly'
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent' // Forces consent screen to appear
        });
    }

    async authenticateWithCode(code: string) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            this.isAuthenticated = true;

            console.log('Successfully authenticated with Google');

            // Store tokens if you want to persist them
            if (tokens.refresh_token) {
                console.log('Refresh token received - user can stay authenticated');
            }

            return tokens;
        } catch (error) {
            console.error('Authentication error:', error);
            throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async loadPresentation(presentationId: string) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated. Please authenticate first.');
        }

        this.presentationId = presentationId;

        try {
            console.log(`Loading presentation: ${presentationId}`);

            const presentation = await this.slides.presentations.get({
                presentationId: presentationId
            });

            // Process slides data
            const slides = presentation.data.slides?.map((slide: any, index: number) => ({
                id: slide.objectId,
                index: index,
                title: this.extractSlideTitle(slide)
            })) || [];

            const result = {
                id: presentationId,
                title: presentation.data.title,
                slideCount: presentation.data.slides?.length || 0,
                slides: slides
            };

            console.log(`Successfully loaded presentation: ${result.title} (${result.slideCount} slides)`);
            return result;

        } catch (error: any) {
            console.error('Failed to load presentation:', error);

            if (error.code === 404) {
                throw new Error('Presentation not found. Check the presentation ID and make sure it\'s shared.');
            } else if (error.code === 403) {
                throw new Error('Access denied. Make sure the presentation is shared with your Google account.');
            } else {
                throw new Error(`Failed to load presentation: ${error.message || 'Unknown error'}`);
            }
        }
    }

    private extractSlideTitle(slide: any): string {
        // Try to extract title from slide elements
        if (slide.pageElements) {
            for (const element of slide.pageElements) {
                if (element.shape && element.shape.text && element.shape.text.textElements) {
                    const textElements = element.shape.text.textElements;
                    for (const textElement of textElements) {
                        if (textElement.textRun && textElement.textRun.content) {
                            const text = textElement.textRun.content.trim();
                            if (text.length > 0 && text.length < 100) {
                                return text;
                            }
                        }
                    }
                }
            }
        }
        return 'Untitled Slide';
    }

    async navigateToSlide(slideIndex: number) {
        // Note: Google Slides API doesn't directly control navigation in presentation mode
        // This would require additional implementation for real-time control
        console.log(`Would navigate to slide ${slideIndex}`);
        return { success: true, slideIndex };
    }

    //returns list of all slides in user's google drive (including link to slides thumbnail)
    async getUserPresentations() {
        const mimeType = 'application/vnd.google-apps.presentation';
        const response = await this.drive.files.list({
            q: `mimetype='${mimeType}'`,
            fields: `files(id,name,thumbnailLink,modifiedTime)`
        });
        return response.data.files;
    }

    //get all slides with thumbnails for a specific presentation
    async getPresentationSlides(presentationId: string) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated. Please authenticate first.');
        }

        try {
            //call the Google Slides API
            const presentation = await this.slides.presentations.get({
                presentationId: presentationId
            });

            //Process slides data from the API response
            const slides = presentation.data.slides?.map((slide: any, index: number) => ({
                slideNumber: index + 1,
                objectId: slide.objectId,
                title: this.extractSlideTitle(slide),
                thumbnailUrl: `https://docs.google.com/presentation/d/${presentationId}/export?format=png&pageid=${slide.objectId}`
            })) || [];

            return {
                slides: slides
            };

        } catch (error: any) {
            console.error('Failed to load presentation slides:', error);

            if (error.code === 404) {
                throw new Error('Presentation not found.');
            } else if (error.code === 403) {
                throw new Error('Access denied.');
            } else {
                throw new Error(`Failed to load slides: ${error.message || 'Unknown error'}`);
            }
        }
    }


    // Added missing methods that server.ts expects
    isReady(): boolean {
        return this.isAuthenticated;
    }

    getCurrentPresentationId(): string | undefined {
        return this.presentationId;
    }
}