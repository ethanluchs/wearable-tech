import { Slide, GestureCommand, PresentationState } from './types';

// This will hold the actual Google Slides data
let slides: Slide[] = [];
let googleSlidesData: any = null;

let presentationState: PresentationState = {
    currentSlideIndex: 0,
    isActive: false,
    totalSlides: 0,
    title: ""
};

/**
 * Load presentation data from Google Slides
 */
function loadPresentationData(googlePresentation: any): void {
    // Store the raw Google Slides data
    googleSlidesData = googlePresentation;
    
    // Convert Google Slides data to our internal format
    slides = googlePresentation.slides.map((slide: any, index: number) => ({
        id: slide.id,
        title: slide.title || `Slide ${index + 1}`,
        content: extractSlideContent(slide),
        viewCount: 0
    }));
    
    // Update presentation state
    presentationState = {
        currentSlideIndex: 0,
        isActive: true,
        totalSlides: slides.length,
        title: googlePresentation.title
    };
    
    console.log(`Loaded presentation: ${presentationState.title} with ${presentationState.totalSlides} slides`);
}

/**
 * Extract readable content from a Google Slide
 */
function extractSlideContent(slide: any): string {
    // This is a simplified content extraction
    // might want to make this more sophisticated based on your needs
    if (slide.title) {
        return slide.title;
    }
    return `Slide content for ${slide.id}`;
}

/**
 * Get current slide data
 */
function getCurrentSlide(): Slide | null {
    if (slides.length === 0 || presentationState.currentSlideIndex >= slides.length) {
        return null;
    }
    return slides[presentationState.currentSlideIndex];
}

/**
 * Get all slides
 */
function getAllSlides(): Slide[] {
    return [...slides];
}

/**
 * Next slide with Google Slides sync
 */
function nextSlide(): Slide | null {
    if (presentationState.currentSlideIndex < slides.length - 1) {
        presentationState.currentSlideIndex++;
        slides[presentationState.currentSlideIndex].viewCount++;
        
        // Log for debugging - in a real app, you might want to trigger 
        // some external presentation control here
        console.log(`Advanced to slide ${presentationState.currentSlideIndex + 1}: ${slides[presentationState.currentSlideIndex].title}`);
        
        return slides[presentationState.currentSlideIndex];
    }
    return null;
}

/**
 * Previous slide with Google Slides sync
 */
function previousSlide(): Slide | null {
    if (presentationState.currentSlideIndex > 0) {
        presentationState.currentSlideIndex--;
        slides[presentationState.currentSlideIndex].viewCount++;
        
        console.log(`Moved back to slide ${presentationState.currentSlideIndex + 1}: ${slides[presentationState.currentSlideIndex].title}`);
        
        return slides[presentationState.currentSlideIndex];
    }
    return null;
}

/**
 * Jump to specific slide
 */
function changeSlide(slideNumber: number): Slide | null {
    if (0 <= slideNumber && slideNumber < presentationState.totalSlides) {
        presentationState.currentSlideIndex = slideNumber;
        slides[presentationState.currentSlideIndex].viewCount++;
        
        console.log(`Jumped to slide ${presentationState.currentSlideIndex + 1}: ${slides[presentationState.currentSlideIndex].title}`);
        
        return slides[presentationState.currentSlideIndex];
    }
    console.log("Index out of bounds for slide length");
    return null;
}

/**
 * Handle gesture commands with real slide data
 */
function handleGesture(command: GestureCommand): string {
    console.log(`Received gesture: ${command.type} (confidence: ${command.confidence})`);
    
    if (command.confidence < 0.7) {
        return "Gesture confidence too low";
    }
    
    if (slides.length === 0) {
        return "No presentation loaded";
    }
    
    switch (command.type) {
        case 'next':
            const nextResult = nextSlide();
            if (nextResult) {
                return `Moved to slide: ${nextResult.title}`;
            } else {
                return "Cannot move forward - already at last slide";
            }
            
        case 'previous':
            const prevResult = previousSlide();
            if (prevResult) {
                return `Moved to slide: ${prevResult.title}`;
            } else {
                return "Cannot move backward - already at first slide";
            }
            
        case 'jump':
            if (command.targetSlide !== undefined) {
                const jumpResult = changeSlide(command.targetSlide);
                if (jumpResult) {
                    return `Jumped to slide: ${jumpResult.title}`;
                } else {
                    return "Invalid slide number";
                }
            } else {
                return "Jump command missing target slide";
            }
            
        case 'point':
            const currentSlide = slides[presentationState.currentSlideIndex];
            return `Pointing at slide: ${currentSlide.title}`;
            
        default:
            return "Unknown gesture type";
    }
}

/**
 * Reset presentation state
 */
function resetPresentation(): void {
    slides = [];
    googleSlidesData = null;
    presentationState = {
        currentSlideIndex: 0,
        isActive: false,
        totalSlides: 0,
        title: ""
    };
}

/**
 * Get presentation analytics
 */
function getPresentationAnalytics() {
    return {
        totalSlides: presentationState.totalSlides,
        currentSlide: presentationState.currentSlideIndex + 1,
        slideViewCounts: slides.map(slide => ({
            id: slide.id,
            title: slide.title,
            viewCount: slide.viewCount
        })),
        mostViewedSlide: slides.reduce((max, slide) => 
            slide.viewCount > max.viewCount ? slide : max, 
            slides[0] || { viewCount: 0 }
        )
    };
}

export {
    nextSlide,
    previousSlide,
    changeSlide,
    handleGesture,
    presentationState,
    slides,
    loadPresentationData,
    getCurrentSlide,
    getAllSlides,
    resetPresentation,
    getPresentationAnalytics
};