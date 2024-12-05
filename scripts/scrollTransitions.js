document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 0;
    const pages = document.querySelectorAll('.page');
    const totalPages = pages.length;
    let isAnimating = false;
    let lastScrollTime = 0;
    const scrollThreshold = 1000; 
    
    const scrollIndicator = document.getElementById('scroll-indicator');
    const scrollIndicatorProgress = document.getElementById('scroll-indicator-progress');
    
    function updateIndicator() {
        const progress = (currentPage / (totalPages - 1)) * 100;
        scrollIndicatorProgress.style.height = `${progress}%`;
        
      
        const hue = (progress / 100) * 120;
        scrollIndicatorProgress.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
    }
    
    function showPage(index) {
        if (isAnimating) return;
        isAnimating = true;
        
        pages.forEach((page, i) => {
            if (i !== currentPage && i !== index) {
                page.style.visibility = 'hidden';
                page.classList.remove('active');
            }
        });
        
        if (pages[currentPage]) {
            pages[currentPage].classList.remove('active');
        }
        
        setTimeout(() => {
            pages[index].style.visibility = 'visible';
            pages[index].classList.add('active');
            
            const event = new Event(`page${index + 1}Active`);
            window.dispatchEvent(event);
            
            currentPage = index;
            updateIndicator();
            
            setTimeout(() => {
                isAnimating = false;
            }, 800);
        }, 50);
    }
    
    function handleNavigation(direction) {
        const now = Date.now();
        if (now - lastScrollTime < scrollThreshold) return;
        lastScrollTime = now;
        
        const nextPage = direction === 'up' 
            ? Math.max(0, currentPage - 1)
            : Math.min(totalPages - 1, currentPage + 1);
            
        if (nextPage !== currentPage) {
            showPage(nextPage);
        }
    }
    
    let wheelAccumulator = 0;
    const wheelThreshold = 50;
    
    window.addEventListener('wheel', function(event) {
        event.preventDefault();
        
        wheelAccumulator += Math.abs(event.deltaY);
        
        if (wheelAccumulator >= wheelThreshold) {
            handleNavigation(event.deltaY < 0 ? 'up' : 'down');
            wheelAccumulator = 0;
        }
    }, { passive: false });
    
    window.addEventListener('keydown', function(event) {
        switch (event.key) {
            case 'ArrowUp':
                handleNavigation('up');
                break;
            case 'ArrowDown':
                handleNavigation('down');
                break;
        }
    });
    
    let touchStartY = 0;
    const touchThreshold = 50;
    
    window.addEventListener('touchstart', function(event) {
        touchStartY = event.touches[0].clientY;
    }, { passive: true });
    
    window.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });
    
    window.addEventListener('touchend', function(event) {
        const touchEndY = event.changedTouches[0].clientY;
        const deltaY = touchEndY - touchStartY;
        
        if (Math.abs(deltaY) >= touchThreshold) {
            handleNavigation(deltaY > 0 ? 'up' : 'down');
        }
    }, { passive: true });
    
    showPage(currentPage);
});