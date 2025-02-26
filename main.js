function setupGlobalErrorHandling() {
    window.addEventListener('error', (event) => {
        logError({
            type: 'unhandled',
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            stack: event.error?.stack
        });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        logError({
            type: 'promise',
            message: event.reason?.message || 'Unhandled Promise Rejection',
            stack: event.reason?.stack
        });
    });
}

async function logError(errorInfo) {
    // Log to console
    console.error('Global error:', errorInfo);
    
    // Log to Firebase
    try {
        const user = auth.currentUser;
        await addDoc(collection(db, 'errorLogs'), {
            ...errorInfo,
            userId: user?.uid || 'anonymous',
            userAgent: navigator.userAgent,
            timestamp: new Date()
        });
    } catch (e) {
        // Fail silently - don't cause errors in error handler
        console.error('Failed to log error:', e);
    }
}

// Call this function on app initialization
setupGlobalErrorHandling();
