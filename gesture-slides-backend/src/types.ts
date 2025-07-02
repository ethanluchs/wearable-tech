export interface Slide {
    id: string;
    title: string;
    content: string;
    viewCount: number;
}

export interface GestureCommand {
    type: 'next' | 'previous' | 'jump' | 'point';
    confidence: number;
    timestamp: number;
    targetSlide: number;
}

export interface PresentationState {
    currentSlideIndex: number;
    isActive: boolean;
    totalSlides: number;
    title: string;
}
