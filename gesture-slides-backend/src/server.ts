import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import {
    nextSlide,
    previousSlide,
    presentationState,
    loadPresentationData,
    getCurrentSlide,
    getAllSlides,
    resetPresentation,
    getPresentationAnalytics,
    changeSlide
} from './presentation';
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
    try {
        const authUrl = slidesAPI.getAuthUrl();
        res.redirect(authUrl);
    } catch (error) {
        res.status(500).send(`<h1>Error generating auth URL</h1><p>${error}</p>`);
    }
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;

    if (code && typeof code === 'string') {
        try {
            await slidesAPI.authenticateWithCode(code);
            res.send(`
                <h1>Authentication successful!</h1>
                <p>You can now close this tab and use the API.</p>
                <p><a href="/">Go back to test interface</a></p>
            `);
        } catch (error) {
            res.status(500).send('<h1>Authentication failed</h1><p>' + error + '</p>');
        }
    } else {
        res.status(400).send('<h1>No authorization code received</h1>');
    }
});

// Check authentication status
app.get('/auth/status', (req, res) => {
    res.json({
        isAuthenticated: slidesAPI.isReady(),
        currentPresentation: slidesAPI.getCurrentPresentationId()
    });
});

// Load presentation route - now syncs with local state
app.post('/presentation/load', async (req: Request, res: Response) => {
    const { presentationId } = req.body;

    if (!presentationId) {
        return res.status(400).json({ error: 'presentationId required' });
    }

    if (!slidesAPI.isReady()) {
        return res.status(401).json({ error: 'Not authenticated with Google' });
    }

    try {
        // Load from Google Slides API
        const googlePresentation = await slidesAPI.loadPresentation(presentationId);

        // Sync with local presentation state
        loadPresentationData(googlePresentation);

        res.json({
            success: true,
            message: `Loaded presentation: ${googlePresentation.title}`,
            presentation: {
                id: googlePresentation.id,
                title: googlePresentation.title,
                slideCount: googlePresentation.slideCount,
                currentSlide: presentationState.currentSlideIndex + 1,
                slides: googlePresentation.slides
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get all slides with their data
app.get('/presentation/slides', (req, res) => {
    if (presentationState.totalSlides === 0) {
        return res.status(400).json({ error: 'No presentation loaded' });
    }

    res.json({
        slides: getAllSlides(),
        currentSlideIndex: presentationState.currentSlideIndex,
        totalSlides: presentationState.totalSlides
    });
});

// Get current slide details
app.get('/presentation/current-slide', (req, res) => {
    const currentSlide = getCurrentSlide();

    if (!currentSlide) {
        return res.status(400).json({ error: 'No presentation loaded or invalid slide' });
    }

    res.json({
        slide: currentSlide,
        slideNumber: presentationState.currentSlideIndex + 1,
        totalSlides: presentationState.totalSlides,
        title: presentationState.title
    });
});

app.get(`/presentations`, async (req, res) => {
    if (!slidesAPI.isReady()) {
        return res.status(401).json({ error: `Stupid ahh boy you're not authenticated` });
    }
    try {
        const presentations = await slidesAPI.getUserPresentations();
        res.json({
            success: true,
            presentations: presentations
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

app.get('/presentations/:id/slides', async (req, res) => {
    const presentationId = req.params.id;

    if (!slidesAPI.isReady()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const result = await slidesAPI.getPresentationSlides(presentationId);
        res.json(result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// Gesture navigation routes - now work with real data
app.post('/gesture/next', (req, res) => {
    if (presentationState.totalSlides === 0) {
        return res.status(400).json({ error: 'No presentation loaded' });
    }

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
    if (presentationState.totalSlides === 0) {
        return res.status(400).json({ error: 'No presentation loaded' });
    }

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

// Jump to specific slide
app.post('/gesture/jump', (req, res) => {
    const { slideNumber } = req.body;

    if (presentationState.totalSlides === 0) {
        return res.status(400).json({ error: 'No presentation loaded' });
    }

    if (typeof slideNumber !== 'number') {
        return res.status(400).json({ error: 'slideNumber must be a number' });
    }

    // Convert from 1-based to 0-based indexing
    const result = changeSlide(slideNumber - 1);

    if (result) {
        res.json({
            success: true,
            message: `Jumped to slide: ${result.title}`,
            currentSlide: presentationState.currentSlideIndex + 1,
            totalSlides: presentationState.totalSlides,
            slideData: result
        });
    } else {
        res.json({
            success: false,
            message: "Invalid slide number",
            currentSlide: presentationState.currentSlideIndex + 1,
            totalSlides: presentationState.totalSlides
        });
    }
});

// Get presentation status
app.get('/presentation/status', (req, res) => {
    res.json({
        currentSlide: presentationState.currentSlideIndex + 1,
        totalSlides: presentationState.totalSlides,
        title: presentationState.title,
        isActive: presentationState.isActive,
        isAuthenticated: slidesAPI.isReady(),
        currentPresentationId: slidesAPI.getCurrentPresentationId()
    });
});

// Get presentation analytics
app.get('/presentation/analytics', (req, res) => {
    if (presentationState.totalSlides === 0) {
        return res.status(400).json({ error: 'No presentation loaded' });
    }

    res.json(getPresentationAnalytics());
});

// Reset presentation
app.post('/presentation/reset', (req, res) => {
    resetPresentation();
    res.json({
        success: true,
        message: 'Presentation reset successfully'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        isAuthenticated: slidesAPI.isReady(),
        presentationLoaded: presentationState.totalSlides > 0,
        currentSlide: presentationState.currentSlideIndex + 1,
        totalSlides: presentationState.totalSlides
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Visit http://localhost:${PORT}/auth/google to authenticate with Google`);
    console.log(`Authentication status: ${slidesAPI.isReady() ? 'Ready' : 'Not authenticated'}`);

    if (presentationState.totalSlides > 0) {
        console.log(`Presentation loaded: ${presentationState.title} (${presentationState.totalSlides} slides)`);
    } else {
        console.log('No presentation loaded yet');
    }
});