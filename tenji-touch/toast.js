class ToastNotification {
    constructor() {
        this.activeToast = null;
        this.init();
    }

    init() {
        this.createToastContainer();
        document.addEventListener('tenjiCharacterRecognized', this.handleCharacterRecognized.bind(this));
        console.log('Toast notification system initialized');
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    handleCharacterRecognized(event) {
        const character = event.detail.character;
        this.showToast(character);
    }

    showToast(character) {
        // Clear any existing toast
        if (this.activeToast) {
            this.clearToast();
        }

        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = character;

        container.appendChild(toast);
        this.activeToast = toast;

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-hide after 500ms
        setTimeout(() => {
            this.clearToast();
        }, 500);
    }

    clearToast() {
        if (this.activeToast) {
            this.activeToast.classList.remove('show');
            this.activeToast.classList.add('hide');
            
            setTimeout(() => {
                if (this.activeToast && this.activeToast.parentNode) {
                    this.activeToast.parentNode.removeChild(this.activeToast);
                }
                this.activeToast = null;
            }, 150);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ToastNotification();
});