export class SuggestionService {
    constructor() {
        this.contextMap = {
            'analytics': [
                'Show me our key performance indicators',
                'What is our current revenue growth rate?',
                'Compare this month\'s performance with last month',
                'What are our top performing room types?'
            ],
            'revenue': [
                'What is our monthly revenue trend?',
                'Which room type generates the most revenue?',
                'Show me revenue per available room (RevPAR)',
                'What is our average daily rate (ADR)?'
            ],
            'occupancy': [
                'What is our current occupancy rate?',
                'Show me occupancy trends by room type',
                'Which days have the highest occupancy?',
                'Predict next month\'s occupancy rate'
            ],
            'bookings': [
                'What is our booking pace?',
                'Show me booking patterns by season',
                'What is our cancellation rate?',
                'Which channels drive most bookings?'
            ],
            'customers': [
                'What is our customer retention rate?',
                'Show me guest satisfaction metrics',
                'What is our repeat booking rate?',
                'Which customer segments are most profitable?'
            ],
            'default': [
                'Show me business performance overview',
                'What are our current market trends?',
                'Identify areas for improvement',
                'Compare performance with targets'
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
        const contextKeywords = {
            analytics: ['performance', 'kpi', 'metrics', 'growth', 'trend'],
            revenue: ['revenue', 'earnings', 'revpar', 'adr', 'sales'],
            occupancy: ['occupancy', 'vacant', 'filled', 'capacity'],
            bookings: ['booking', 'reservation', 'cancellation', 'pace'],
            customers: ['customer', 'guest', 'satisfaction', 'retention']
        };

        for (const [context, keywords] of Object.entries(contextKeywords)) {
            if (keywords.some(keyword => responseText.includes(keyword))) {
                return context;
            }
        }
        return 'default';
    }
}
