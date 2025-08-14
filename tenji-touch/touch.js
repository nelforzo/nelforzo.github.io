class TouchHandler {
    constructor() {
        this.touchData = {
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            startTime: 0,
            endTime: 0,
            moved: false
        };
        this.gestureThreshold = window.innerWidth * 0.1;
        this.lastGestureX = 0;
        this.lastGestureY = 0;
        this.gestureStartX = 0;
        this.gestureStartY = 0;
        this.isTracking = false;
        this.hasSlideGestures = false;
        this.init();
    }

    init() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        console.log('Touch handler initialized');
    }

    handleTouchStart(event) {
        const touch = event.touches[0];
        this.touchData.startX = touch.clientX;
        this.touchData.startY = touch.clientY;
        this.touchData.startTime = Date.now();
        this.touchData.moved = false;
        this.hasSlideGestures = false;
        
        console.log('Touch Start:', {
            x: this.touchData.startX,
            y: this.touchData.startY,
            time: this.touchData.startTime
        });
    }

    handleTouchMove(event) {
        this.touchData.moved = true;
        const touch = event.touches[0];
        
        if (!this.isTracking) {
            this.gestureStartX = touch.clientX;
            this.gestureStartY = touch.clientY;
            this.isTracking = true;
        }
        
        const deltaX = touch.clientX - this.gestureStartX;
        const deltaY = touch.clientY - this.gestureStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance >= this.gestureThreshold) {
            const gesture = this.recognizeGesture(deltaX, deltaY);
            if (gesture !== 'TAP') {
                this.hasSlideGestures = true;
                console.log('🔗 Chained Gesture:', gesture);
                
                const gestureEvent = new CustomEvent('gestureDetected', {
                    detail: {
                        startX: this.gestureStartX,
                        startY: this.gestureStartY,
                        endX: touch.clientX,
                        endY: touch.clientY,
                        deltaX: deltaX,
                        deltaY: deltaY,
                        gesture: gesture,
                        chained: true
                    }
                });
                document.dispatchEvent(gestureEvent);
                
                this.gestureStartX = touch.clientX;
                this.gestureStartY = touch.clientY;
            }
        }
        
        // console.log('Touch Move:', {
        //     x: touch.clientX,
        //     y: touch.clientY,
        //     deltaX: touch.clientX - this.touchData.startX,
        //     deltaY: touch.clientY - this.touchData.startY,
        //     gestureDistance: distance.toFixed(2),
        //     threshold: this.gestureThreshold.toFixed(2)
        // });
    }

    handleTouchEnd(event) {
        const touch = event.changedTouches[0];
        this.touchData.endX = touch.clientX;
        this.touchData.endY = touch.clientY;
        this.touchData.endTime = Date.now();
        
        const deltaX = this.touchData.endX - this.touchData.startX;
        const deltaY = this.touchData.endY - this.touchData.startY;
        const duration = this.touchData.endTime - this.touchData.startTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Check if there's an incomplete slide gesture at the end
        if (this.isTracking && this.hasSlideGestures) {
            const finalDeltaX = touch.clientX - this.gestureStartX;
            const finalDeltaY = touch.clientY - this.gestureStartY;
            const finalDistance = Math.sqrt(finalDeltaX * finalDeltaX + finalDeltaY * finalDeltaY);
            
            if (finalDistance >= this.gestureThreshold) {
                const finalGesture = this.recognizeGesture(finalDeltaX, finalDeltaY);
                if (finalGesture !== 'TAP') {
                    console.log('🔗 Final Chained Gesture:', finalGesture);
                    
                    const gestureEvent = new CustomEvent('gestureDetected', {
                        detail: {
                            startX: this.gestureStartX,
                            startY: touch.clientX,
                            endX: touch.clientX,
                            endY: touch.clientY,
                            deltaX: finalDeltaX,
                            deltaY: finalDeltaY,
                            gesture: finalGesture,
                            chained: true
                        }
                    });
                    document.dispatchEvent(gestureEvent);
                }
            }
        }
        // Only fire TAP if there were no slide gestures at all
        else if (!this.hasSlideGestures && (!this.touchData.moved || distance < this.gestureThreshold)) {
            const gestureEvent = new CustomEvent('gestureDetected', {
                detail: {
                    ...this.touchData,
                    gesture: 'TAP',
                    chained: false
                }
            });
            document.dispatchEvent(gestureEvent);
        }
        
        this.isTracking = false;
        this.hasSlideGestures = false;
        
        console.log('Touch End:', {
            startX: this.touchData.startX,
            startY: this.touchData.startY,
            endX: this.touchData.endX,
            endY: this.touchData.endY,
            deltaX: deltaX,
            deltaY: deltaY,
            distance: distance.toFixed(2),
            duration: duration + 'ms',
            threshold: this.gestureThreshold.toFixed(2),
            hadSlideGestures: this.hasSlideGestures
        });
    }

    recognizeGesture(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (Math.max(absDeltaX, absDeltaY) < this.gestureThreshold) {
            return 'TAP';
        }
        
        if (absDeltaX > absDeltaY) {
            return deltaX > 0 ? 'SLIDE_RIGHT' : 'SLIDE_LEFT';
        } else {
            return deltaY > 0 ? 'SLIDE_DOWN' : 'SLIDE_UP';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TouchHandler();
});