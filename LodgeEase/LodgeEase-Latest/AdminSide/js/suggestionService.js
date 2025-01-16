export class SuggestionService {
    constructor() {
        this.contextMap = {
            'occupancy': [
                'What is the peak occupancy month?',
                'How does occupancy compare to last year?',
                'Which room types have highest occupancy?'
            ],
            'revenue': [
                'What is our total revenue this month?',
                'Show me revenue trends by room type',
                'What is our projected revenue growth?'
            ],
            'booking': [
                'What are the peak booking hours?',
                'Show me booking patterns by day',
                'What is our average length of stay?'
            ],
            'customer': [
                'What is our customer satisfaction rate?',
                'Show me feedback trends',
                'Which room types get best reviews?'
            ],
            'default': [
                'Show me occupancy trends',
                'How is our revenue performance?',
                'What are the current booking patterns?',
                'Show customer satisfaction metrics'
            ]
        };
    }

    generateSuggestions(context) {
        const suggestions = this.contextMap[context] || this.contextMap.default;
        return suggestions.map(text => ({
            text,
            action: () => text
        }));
    }

    getSuggestionsByResponse(response) {
        // Determine context from response
        const context = this.determineContext(response);
        return this.generateSuggestions(context);
    }

    determineContext(response) {
        const responseText = response.toLowerCase();
        if (responseText.includes('occupancy') || responseText.includes('occupied')) return 'occupancy';
        if (responseText.includes('revenue') || responseText.includes('earnings')) return 'revenue';
        if (responseText.includes('booking') || responseText.includes('reservation')) return 'booking';
        if (responseText.includes('customer') || responseText.includes('satisfaction')) return 'customer';
        return 'default';
    }
}
