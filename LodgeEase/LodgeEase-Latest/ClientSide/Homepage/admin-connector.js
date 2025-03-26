/**
 * LodgeEase Admin Connector
 * This script enables communication between the client site and admin panel
 */

// Use regular variable declarations instead of import statements
(function() {
    // Create a client connection manager for admin communication
    class LodgeEaseClientConnector {
        constructor() {
            this.isReady = false;
            this.isAdmin = false;
            this.pendingRequests = new Map();
            this.lodges = null;
            this.authToken = 'lodgeease-admin-token';
            
            // Set up message listener
            window.addEventListener('message', this.handleMessage.bind(this));
            
            // Announce presence to parent frame (if in iframe)
            this.announcePresence();
            
            console.log('LodgeEase Client Connector initialized');
        }

        /**
         * Announce client presence to any parent frames
         */
        announcePresence() {
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'CLIENT_READY',
                        clientInfo: {
                            url: window.location.href,
                            title: document.title,
                            timestamp: Date.now()
                        }
                    }, '*');
                    
                    console.log('Announced presence to parent frame');
                }
            } catch (error) {
                console.error('Error announcing presence:', error);
            }
        }

        /**
         * Handle incoming messages from admin
         * @param {MessageEvent} event - The message event
         */
        handleMessage(event) {
            const data = event.data;
            
            // Only process messages from our admin
            if (!data || data.type !== 'LODGEEASE_ADMIN') {
                return;
            }
            
            console.log('Received message from admin:', data.action);
            
            try {
                // Process different actions
                switch (data.action) {
                    case 'PING':
                        this.respondToMessage(event, {
                            action: 'PONG',
                            clientInfo: {
                                url: window.location.href,
                                title: document.title,
                                ready: this.isReady
                            },
                            success: true
                        });
                        break;
                        
                    case 'AUTHENTICATE':
                        const authResult = this.handleAuthentication(data.token);
                        this.respondToMessage(event, {
                            action: 'AUTH_RESULT',
                            success: authResult,
                            error: authResult ? null : 'Authentication failed'
                        });
                        break;
                        
                    case 'GET_LODGES':
                        this.getLodges().then(lodges => {
                            this.respondToMessage(event, {
                                action: 'LODGES_DATA',
                                lodges: lodges,
                                success: true
                            });
                        }).catch(error => {
                            this.respondToMessage(event, {
                                action: 'ERROR',
                                error: error.message,
                                success: false
                            });
                        });
                        break;
                        
                    case 'ADD_LODGE':
                        this.addLodge(data.lodge).then(success => {
                            this.respondToMessage(event, {
                                action: 'LODGE_ADDED',
                                success: success
                            });
                        }).catch(error => {
                            this.respondToMessage(event, {
                                action: 'ERROR',
                                error: error.message,
                                success: false
                            });
                        });
                        break;
                        
                    case 'UPDATE_LODGE':
                        this.updateLodge(data.lodgeId, data.updatedData).then(success => {
                            this.respondToMessage(event, {
                                action: 'LODGE_UPDATED',
                                success: success
                            });
                        }).catch(error => {
                            this.respondToMessage(event, {
                                action: 'ERROR',
                                error: error.message,
                                success: false
                            });
                        });
                        break;
                        
                    case 'REMOVE_LODGE':
                        this.removeLodge(data.lodgeId).then(success => {
                            this.respondToMessage(event, {
                                action: 'LODGE_REMOVED',
                                success: success
                            });
                        }).catch(error => {
                            this.respondToMessage(event, {
                                action: 'ERROR',
                                error: error.message,
                                success: false
                            });
                        });
                        break;
                        
                    default:
                        this.respondToMessage(event, {
                            action: 'ERROR',
                            error: `Unknown action: ${data.action}`,
                            success: false
                        });
                }
            } catch (error) {
                console.error('Error processing admin message:', error);
                this.respondToMessage(event, {
                    action: 'ERROR',
                    error: error.message,
                    success: false
                });
            }
        }

        /**
         * Respond to a message
         * @param {MessageEvent} event - The original message event
         * @param {object} responseData - The response data
         */
        respondToMessage(event, responseData) {
            if (!event.source) {
                console.error('Cannot respond to message - no source');
                return;
            }
            
            // Add request ID to response if present in original message
            if (event.data.requestId) {
                responseData.requestId = event.data.requestId;
            }
            
            // Add client type to all responses
            responseData.type = 'LODGEEASE_CLIENT';
            
            event.source.postMessage(responseData, '*');
            console.log('Sent response:', responseData.action);
        }

        /**
         * Handle authentication request
         * @param {string} token - Authentication token
         * @returns {boolean} - Whether authentication was successful
         */
        handleAuthentication(token) {
            // Simple token validation
            this.isAdmin = (token === this.authToken);
            return this.isAdmin;
        }

        /**
         * Get all lodges from the page
         * @returns {Promise<Array>} - Array of lodges
         */
        async getLodges() {
            try {
                // Use window.LodgeEasePublicAPI to get lodges
                if (window.LodgeEasePublicAPI && typeof window.LodgeEasePublicAPI.getAllLodges === 'function') {
                    return window.LodgeEasePublicAPI.getAllLodges();
                }
                
                // Fallback to finding lodge cards in the DOM
                const lodgeCards = document.querySelectorAll('.lodge-card');
                if (lodgeCards.length === 0) {
                    throw new Error('No lodge cards found in the DOM');
                }
                
                return Array.from(lodgeCards).map(card => {
                    return {
                        id: card.dataset.lodgeId || 'unknown',
                        name: card.querySelector('h2')?.textContent || 'Unknown Lodge',
                        location: card.querySelector('.location span')?.textContent || 'Unknown Location',
                        price: this.extractPrice(card.querySelector('.price')?.textContent || '0'),
                        image: card.querySelector('img')?.src || '',
                        rating: parseFloat(card.querySelector('.rating span:last-child')?.textContent || '0')
                    };
                });
            } catch (error) {
                console.error('Error getting lodges:', error);
                throw error;
            }
        }

        /**
         * Extract price from price text
         * @param {string} priceText - The price text (e.g. "₱1,200 /night")
         * @returns {number} - The price as a number
         */
        extractPrice(priceText) {
            try {
                return parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
            } catch (error) {
                return 0;
            }
        }

        /**
         * Add a new lodge
         * @param {object} lodge - The lodge to add
         * @returns {Promise<boolean>} - Whether the lodge was added successfully
         */
        async addLodge(lodge) {
            if (!this.isAdmin) {
                throw new Error('Not authenticated as admin');
            }
            
            try {
                if (window.LodgeEasePublicAPI && typeof window.LodgeEasePublicAPI.addNewLodge === 'function') {
                    return window.LodgeEasePublicAPI.addNewLodge(lodge);
                }
                
                throw new Error('Add lodge functionality not available');
            } catch (error) {
                console.error('Error adding lodge:', error);
                throw error;
            }
        }

        /**
         * Update an existing lodge
         * @param {string|number} lodgeId - The ID of the lodge to update
         * @param {object} updatedData - The updated lodge data
         * @returns {Promise<boolean>} - Whether the lodge was updated successfully
         */
        async updateLodge(lodgeId, updatedData) {
            if (!this.isAdmin) {
                throw new Error('Not authenticated as admin');
            }
            
            try {
                if (window.LodgeEasePublicAPI && typeof window.LodgeEasePublicAPI.updateLodge === 'function') {
                    return window.LodgeEasePublicAPI.updateLodge(lodgeId, updatedData);
                }
                
                throw new Error('Update lodge functionality not available');
            } catch (error) {
                console.error('Error updating lodge:', error);
                throw error;
            }
        }

        /**
         * Remove a lodge
         * @param {string|number} lodgeId - The ID of the lodge to remove
         * @returns {Promise<boolean>} - Whether the lodge was removed successfully
         */
        async removeLodge(lodgeId) {
            if (!this.isAdmin) {
                throw new Error('Not authenticated as admin');
            }
            
            try {
                if (window.LodgeEasePublicAPI && typeof window.LodgeEasePublicAPI.removeLodge === 'function') {
                    return window.LodgeEasePublicAPI.removeLodge(lodgeId);
                }
                
                throw new Error('Remove lodge functionality not available');
            } catch (error) {
                console.error('Error removing lodge:', error);
                throw error;
            }
        }
    }

    // Initialize the client connector when the document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.lodgeEaseClient = new LodgeEaseClientConnector();
        });
    } else {
        window.lodgeEaseClient = new LodgeEaseClientConnector();
    }
})();
