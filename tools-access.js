(() => {
    const toolsPaused = true;
    if (!toolsPaused) return;

    const isToolPage = window.location.pathname.includes('/color/');
    const destination = isToolPage ? '../tools-paused.html' : 'tools-paused.html';
    window.location.replace(new URL(destination, window.location.href).href);
})();
