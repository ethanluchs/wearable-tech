import {Slide, GestureCommand, PresentationState} from './types';

// Create sample data
const slides: Slide[] = [
    { id: "intro", title: "Introduction", content: "Welcome!", viewCount: 0 },
    { id: "overview", title: "Overview", content: "Here's what we'll cover", viewCount: 0 },
    { id: "details", title: "Details", content: "Deep dive into concepts", viewCount: 0 },
    { id: "examples", title: "Examples", content: "Real world examples", viewCount: 0 },
    { id: "conclusion", title: "Conclusion", content: "Thank you!", viewCount: 0 }
];

let presentationState: PresentationState = {
    currentSlideIndex: 0,
    isActive: false,
    totalSlides: slides.length,
    title: ""
};

/*
takes no parameters
returns Slide | null, increments currentSlideIndex as appropriate
*/
function nextSlide(): Slide | null {
    if (presentationState.currentSlideIndex < slides.length - 1)
    {
        presentationState.currentSlideIndex++;
        slides[presentationState.currentSlideIndex].viewCount++;
        return slides[presentationState.currentSlideIndex];
    }
    return null;
}

function previousSlide(): Slide | null {
    if (presentationState.currentSlideIndex > 0) {
        presentationState.currentSlideIndex--;
        slides[presentationState.currentSlideIndex].viewCount++;
        return slides[presentationState.currentSlideIndex];
    }
    return null;
}

/*
takes slideNumber parameter (0 based indexing)
returns Slide | null
either change currentSlideIndex or return null
*/
function changeSlide(slideNumber: number): Slide | null{
    if (0 <= slideNumber && slideNumber < presentationState.totalSlides)
    {
        presentationState.currentSlideIndex = slideNumber;
        slides[presentationState.currentSlideIndex].viewCount++;
        return slides[presentationState.currentSlideIndex];
    }
    console.log("index out of bounds for slide length");
        return null;
    
}

/*
takes GestureCommand parameter
returns descriptive string and console.log gesture type and confidence
*/
function handleGesture(command: GestureCommand): string {
    console.log(`Received gesture: ${command.type} (confidence: ${command.confidence})`);
    
    if (command.confidence < 0.7) {
        return "Gesture confidence too low";
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

export {
    nextSlide,
    previousSlide,
    changeSlide,
    handleGesture,
    presentationState,
    slides
};