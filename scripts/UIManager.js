class UIManager {
    constructor() {
        this.themeIcon = document.querySelector('#themeToggle span');
        this.resultsContainer = document.getElementById("resultsContainer");
        this.emptyState = document.getElementById("emptyState");
        this.errorContainer = document.getElementById("errorContainer");
        this.actionsContainer = document.getElementById("actionsContainer");
        this.buttons = this.actionsContainer.querySelectorAll('button');
        
        this.initTheme();
    }

    // --- Theme Logic ---
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeIcon.textContent = 'light_mode';
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.themeIcon.textContent = 'dark_mode';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.themeIcon.textContent = 'light_mode';
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.themeIcon.textContent = 'dark_mode';
        }
        localStorage.setItem('theme', newTheme);
    }

    // --- Controls Logic ---
    enableControls(enable) {
        if (enable) {
            this.actionsContainer.classList.remove('disabled');
            this.buttons.forEach(btn => btn.disabled = false);
        } else {
            this.actionsContainer.classList.add('disabled');
            this.buttons.forEach(btn => btn.disabled = true);
        }
    }

    resetView() {
        document.getElementById("tablePreview").innerHTML = "";
        document.getElementById("errorTablePreview").innerHTML = "";
        document.getElementById("pagination").innerHTML = "";
        this.resultsContainer.style.display = "none";
        this.emptyState.style.display = "flex";
        this.errorContainer.style.display = "none";
        this.enableControls(false);
    }

    showResults(hasErrors, errorCount = 0, stdUnit = 0, stdSntin = 0) {
        this.emptyState.style.display = "none";
        this.resultsContainer.style.display = "block";
        
        if (hasErrors) {
            this.errorContainer.style.display = "block";
            document.getElementById("errorCount").textContent = errorCount;
            document.getElementById("expectedSntinLen").textContent = stdSntin;
            document.getElementById("expectedUnitLen").textContent = stdUnit;
        }
    }

    // --- Toast Notifications ---
    showStatus(msg, type = "info") {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check_circle';
        if (type === 'error') iconName = 'error';

        toast.innerHTML = `
            <span class="material-symbols-outlined">${iconName}</span>
            <span>${msg}</span>
            <button class="toast-btn-close" onclick="uiManager.closeToast(this)">
                <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
            </button>
        `;

        container.appendChild(toast);

        if (type !== 'error') {
            setTimeout(() => {
                if(toast && toast.parentElement) this.closeToast(toast.querySelector('.toast-btn-close'));
            }, 5000);
        }
    }

    closeToast(btn) {
        const toast = btn.closest('.toast');
        toast.classList.add('hide');
        setTimeout(() => { if(toast.parentElement) toast.remove(); }, 300);
    }
}