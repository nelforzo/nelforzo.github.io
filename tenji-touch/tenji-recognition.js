class TenjiRecognition {
    constructor() {
        this.characters = this.initializeCharacterMap();
        this.gestureBuffer = [];
        this.maxRows = 3;
        this.init();
    }

    init() {
        document.addEventListener('gestureDetected', this.handleGesture.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        console.log('Tenji recognition initialized');
    }

    initializeCharacterMap() {
        return {
            // A-gyo (あ行) - Vowels
            'あ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'none' }],
            'い': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'none' }],
            'う': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'none' }],
            'え': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'none' }],
            'お': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'left' }],

            // Ka-gyo (か行)
            'か': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'left' }],
            'き': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'left' }],
            'く': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'left' }],
            'け': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'left' }],
            'こ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],

            // Sa-gyo (さ行)
            'さ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'し': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'す': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'both' }],
            'せ': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'both' }],
            'そ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],

            // Ta-gyo (た行)
            'た': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'right' }],
            'ち': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'right' }],
            'つ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'て': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'と': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],

            // Na-gyo (な行)
            'な': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'right' }],
            'に': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'right' }],
            'ぬ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'right' }],
            'ね': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'right' }],
            'の': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],

            // Ha-gyo (は行)
            'は': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],
            'ひ': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],
            'ふ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'へ': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'ほ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],

            // Ma-gyo (ま行)
            'ま': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'both' }],
            'み': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'both' }],
            'む': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'め': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            'も': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }],

            // Ya-gyo (や行)
            'や': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'left' }],
            'ゆ': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'left' }],
            'よ': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'both' }],

            // Ra-gyo (ら行)
            'ら': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'none' }],
            'り': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'none' }],
            'る': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'none' }],
            'れ': [{ row: 1, pattern: 'both' }, { row: 2, pattern: 'both' }, { row: 3, pattern: 'none' }],
            'ろ': [{ row: 1, pattern: 'right' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'left' }],

            // Wa-gyo (わ行)
            'わ': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'none' }],
            'を': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'left' }],

            // Special Characters
            'ん': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'both' }],
            'っ': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'none' }],
            'ー': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            '、': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'none' }],
            '。': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'left' }],
            '？': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'right' }, { row: 3, pattern: 'both' }],
            '！': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'left' }, { row: 3, pattern: 'both' }],
            '・': [{ row: 1, pattern: 'none' }, { row: 2, pattern: 'none' }, { row: 3, pattern: 'both' }]
        };
    }

    handleGesture(event) {
        const gesture = event.detail.gesture;
        let pattern;

        switch (gesture) {
            case 'SLIDE_LEFT':
                pattern = 'left';
                break;
            case 'SLIDE_RIGHT':
                pattern = 'right';
                break;
            case 'SLIDE_UP':
                pattern = 'both';
                break;
            case 'SLIDE_DOWN':
                pattern = 'none';
                break;
            case 'TAP':
                // TAP gestures are independent and don't affect tenji recognition
                return;
            default:
                return;
        }

        // Only process chained slide gestures for tenji recognition
        if (event.detail.chained && pattern) {
            this.gestureBuffer.push(pattern);
        }
    }

    handleTouchEnd() {
        if (this.gestureBuffer.length === 0) {
            return;
        }

        const lastThreeGestures = this.gestureBuffer.slice(-3);
        
        if (this.isNullificationPattern(lastThreeGestures)) {
            console.log('🚫 Input cleared');
            this.gestureBuffer = [];
            return;
        }

        if (lastThreeGestures.length === 3) {
            const pattern = lastThreeGestures.map((gesture, index) => ({
                row: index + 1,
                pattern: gesture
            }));
            
            this.recognizeAndDispatchCharacter(pattern);
        }

        this.gestureBuffer = [];
    }

    isNullificationPattern(gestures) {
        return gestures.length === 3 && 
               gestures.every(gesture => gesture === 'both');
    }

    recognizeAndDispatchCharacter(pattern) {
        const recognizedChar = this.recognizeCharacter(pattern);
        
        if (recognizedChar) {
            console.log('🎯 Recognized character:', recognizedChar);
            
            const tenjiEvent = new CustomEvent('tenjiCharacterRecognized', {
                detail: {
                    character: recognizedChar,
                    pattern: pattern.slice()
                }
            });
            document.dispatchEvent(tenjiEvent);
        } else {
            console.log('❌ Pattern not recognized:', pattern);
        }
    }

    recognizeCharacter(inputPattern) {
        for (const [character, expectedPattern] of Object.entries(this.characters)) {
            if (this.patternsMatch(inputPattern, expectedPattern)) {
                return character;
            }
        }
        return null;
    }

    patternsMatch(inputPattern, expectedPattern) {
        if (inputPattern.length !== expectedPattern.length) {
            return false;
        }
        
        for (let i = 0; i < inputPattern.length; i++) {
            if (inputPattern[i].pattern !== expectedPattern[i].pattern) {
                return false;
            }
        }
        
        return true;
    }

    getGestureBuffer() {
        return this.gestureBuffer.slice();
    }

    clearGestureBuffer() {
        this.gestureBuffer = [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TenjiRecognition();
});