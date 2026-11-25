(() => {
    const disclosurePaused = true;
    if (!disclosurePaused) return;

    window.location.replace(new URL('tokutei-paused.html', window.location.href).href);
})();
