class GestureRecognizer {
    constructor() {
        this.SLIDE_THRESHOLD = window.innerWidth * 0.1;
        this.init();
    }

    init() {
        document.addEventListener('gestureDetected', this.handleGesture.bind(this));
        console.log('Gesture recognizer initialized');
    }

    handleGesture(event) {
        const touchData = event.detail;
        
        if (touchData.gesture) {
            const gestureType = touchData.chained ? 'CHAINED' : 'FINAL';
            console.log(`🎯 ${gestureType} Gesture:`, touchData.gesture);
            if (window.audioFeedback) {
                window.audioFeedback.playGestureSound(touchData.gesture);
            }
        } else {
            const gesture = this.recognizeGesture(touchData);
            console.log('🎯 Gesture Recognized:', gesture);
            if (window.audioFeedback) {
                window.audioFeedback.playGestureSound(gesture);
            }
        }
    }

    recognizeGesture(touchData) {
        const deltaX = touchData.endX - touchData.startX;
        const deltaY = touchData.endY - touchData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < this.SLIDE_THRESHOLD) {
            return 'TAP';
        }
        
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (absDeltaX > absDeltaY) {
            return deltaX > 0 ? 'SLIDE_RIGHT' : 'SLIDE_LEFT';
        } else {
            return deltaY > 0 ? 'SLIDE_DOWN' : 'SLIDE_UP';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GestureRecognizer();
});