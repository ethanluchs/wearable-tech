import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { nextSlide, previousSlide, presentationState } from './presentation';
import { SlidesAPI } from './slidesAPI';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Slides API
const slidesAPI = new SlidesAPI();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication routes
app.get('/auth/google', (req, res) => {
    const authUrl = slidesAPI.getAuthUrl();
    res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (code && typeof code === 'string') {
        try {
            await slidesAPI.authenticateWithCode(code);
            res.send('<h1>Authentication successful!</h1><p>You can now close this tab and use the API.</p>');
        } catch (error) {
            res.status(500).send('<h1>Authentication failed</h1><p>' + error + '</p>');
        }
    } else {
        res.status(400).send('<h1>No authorization code received</h1>');
    }
});

// Load presentation route
app.post('/presentation/load', async (req: Request, res: Response) => {
    const { presentationId } = req.body;
    
    if (!presentationId) {
        return res.status(400).json({ error: 'presentationId required' });
    }
    
    try {
        const presentation = await slidesAPI.loadPresentation(presentationId);
        res.json({
            success: true,
            message: `Loaded presentation: ${presentation.title}`,
            presentation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Your existing gesture routes (unchanged)
app.post('/gesture/next', (req, res) => {
    const result = nextSlide();
    
    if (result) {
        res.json({
            success: true,
            message: `Advanced to slide: ${result.title}`,
            currentSlide: presentationState.currentSlideIndex + 1,
            totalSlides: presentationState.totalSlides,
            slideData: result
        });
    } else {
        res.json({
            success: false,
            message: "Already at last slide",
            currentSlide: presentationState.currentSlideIndex + 1,
            totalSlides: presentationState.totalSlides
        });
    }
});

app.post('/gesture/previous', (req, res) => {
    const result = previousSlide();
    
    if (result) {
        res.json({
            success: true,
            message: `Moved back to slide: ${result.title}`,
            currentSlide: presentationState.currentSlideIndex + 1,
            totalSlides: presentationState.totalSlides,
            slideData: result
        });
    } else {
        res.json({
            success: false,
            message: "Already at first slide",
            currentSlide: presentationState.currentSlideIndex + 1,
            totalSlides: presentationState.totalSlides
        });
    }
});

app.get('/presentation/status', (req, res) => {
    res.json({
        currentSlide: presentationState.currentSlideIndex + 1,
        totalSlides: presentationState.totalSlides,
        title: presentationState.title,
        isActive: presentationState.isActive
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Presentation loaded with ${presentationState.totalSlides} slides`);
    console.log(`Visit http://localhost:${PORT}/auth/google to authenticate with Google`);
});