async savePredictionsToFirebase(predictions) {
    try {
        // Enhanced validation
        if (!predictions) {
            console.warn('No predictions data provided');
            return null;
        }
        
        // Ensure all required fields exist
        const requiredFields = ['revenue', 'occupancy'];
        const missingFields = requiredFields.filter(field => !predictions[field]);
        
        if (missingFields.length > 0) {
            console.warn(`Missing required prediction fields: ${missingFields.join(', ')}`);
            return null;
        }
        
        // Validate data types and values
        if (typeof predictions.revenue !== 'object' || typeof predictions.occupancy !== 'object') {
            console.warn('Revenue and occupancy must be objects');
            return null;
        }
        
        // Proceed with saving to Firebase
        const predictionsCollection = collection(db, 'predictions');
        const docRef = await addDoc(predictionsCollection, {
            ...predictions,
            createdAt: Timestamp.now(),
            userId: auth.currentUser?.uid || 'system'
        });
        
        console.log('Predictions saved successfully with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving predictions to Firebase:', error);
        if (error.code === 'permission-denied') {
            alert('You do not have permission to save predictions');
        }
        return null;
    }
}

validatePredictionData(data) {
    if (!data) return { isValid: false, error: 'No data provided' };
    if (!data.revenue) return { isValid: false, error: 'Missing revenue data' };
    if (!data.occupancy) return { isValid: false, error: 'Missing occupancy data' };
    return { isValid: true };
}
