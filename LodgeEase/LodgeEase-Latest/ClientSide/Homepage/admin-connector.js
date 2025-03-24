/**
 * This script connects the client-side homepage to lodges created in the admin panel
 * It should be included in the rooms.html page
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
// Use the same config as in your admin app
const firebaseConfig = {
  apiKey: "AIzaSyCiNQxfq75gaFStXcHvry5cKz0wUyt6a-s",
  authDomain: "lms-app-2b903.firebaseapp.com",
  projectId: "lms-app-2b903",
  storageBucket: "lms-app-2b903.appspot.com",
  messagingSenderId: "329840168317",
  appId: "1:329840168317:web:c9412211ed14a104597dd4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Fetch lodges from the admin panel to display on the client side
 * @returns {Promise<Array>} Array of lodge data
 */
export async function getAdminLodges() {
  try {
    // Query the lodges collection for items marked to show on client
    const lodgesQuery = query(
      collection(db, "lodges"),
      where("showOnClient", "==", true),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const querySnapshot = await getDocs(lodgesQuery);
    const lodges = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Process Firebase timestamp objects to regular dates
      const processedData = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      };
      
      lodges.push(processedData);
    });
    
    console.log(`Found ${lodges.length} lodges from admin panel`);
    return lodges;
    
  } catch (error) {
    console.error("Error fetching admin lodges:", error);
    return [];
  }
}

/**
 * LodgeEase Admin Connector
 * This script provides integration between the admin panel and client-side lodge listings.
 * It enables real-time updates and synchronization of lodge data.
 */

(function() {
    // Store original console methods
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn
    };

    // Wrapper for console methods to add "AdminConnector:" prefix
    function createLogger() {
        return {
            log: (...args) => originalConsole.log('AdminConnector:', ...args),
            error: (...args) => originalConsole.error('AdminConnector:', ...args),
            warn: (...args) => originalConsole.warn('AdminConnector:', ...args)
        };
    }
    
    const logger = createLogger();

    class AdminConnector {
        constructor() {
            this.isConnected = false;
            this.isAdmin = false;
            this.adminOrigins = [
                'http://localhost',
                'http://127.0.0.1',
                'https://lodgeease.web.app',
                'https://lodgeease.firebaseapp.com'
            ];
            
            this.setupMessageListener();
            logger.log('Initialized and listening for admin messages');
        }

        setupMessageListener() {
            // Listen for messages from the admin panel
            window.addEventListener('message', (event) => this.handleMessage(event), false);
            
            // Announce presence to potential parent frames
            this.broadcastPresence();
        }

        broadcastPresence() {
            try {
                // If we're in an iframe, send a message to the parent
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'CLIENT_READY',
                        clientType: 'lodgeease-client',
                        timestamp: new Date().toISOString()
                    }, '*');
                    logger.log('Sent presence announcement to parent frame');
                }
            } catch (e) {
                logger.error('Error sending presence message:', e);
            }
            
            // Try again in 2 seconds, in case the admin panel wasn't loaded yet
            setTimeout(() => this.broadcastPresence(), 2000);
        }

        handleMessage(event) {
            // Validate the origin for security
            if (!this.isValidAdminOrigin(event.origin)) {
                return;
            }
            
            const data = event.data;
            if (!data || !data.type || !data.action) {
                return;
            }
            
            // Verify this is a message for our system
            if (data.type !== 'LODGEEASE_ADMIN') {
                return;
            }
            
            logger.log('Received valid admin message:', data.action);
            
            // Process the message based on action
            switch (data.action) {
                case 'PING':
                    this.handlePing(event.source, data);
                    break;
                    
                case 'GET_LODGES':
                    this.handleGetLodges(event.source, data);
                    break;
                    
                case 'ADD_LODGE':
                    this.handleAddLodge(event.source, data);
                    break;
                    
                case 'UPDATE_LODGE':
                    this.handleUpdateLodge(event.source, data);
                    break;
                    
                case 'REMOVE_LODGE':
                    this.handleRemoveLodge(event.source, data);
                    break;
                    
                case 'AUTHENTICATE':
                    this.handleAuthenticate(event.source, data);
                    break;
                    
                default:
                    logger.warn('Unknown action:', data.action);
            }
        }

        isValidAdminOrigin(origin) {
            // Check if the origin is in our allowed list
            return this.adminOrigins.some(allowedOrigin => 
                origin.startsWith(allowedOrigin)
            );
        }

        handlePing(source, data) {
            this.isConnected = true;
            this.sendResponse(source, {
                type: 'LODGEEASE_CLIENT',
                action: 'PONG',
                requestId: data.requestId,
                clientInfo: {
                    version: '1.0.0',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            });
        }

        handleGetLodges(source, data) {
            try {
                if (!window.LodgeEasePublicAPI) {
                    throw new Error('Lodge API not available');
                }
                
                const lodges = window.LodgeEasePublicAPI.getAllLodges();
                
                this.sendResponse(source, {
                    type: 'LODGEEASE_CLIENT',
                    action: 'LODGES_DATA',
                    requestId: data.requestId,
                    lodges: lodges,
                    success: true,
                    count: lodges.length
                });
            } catch (error) {
                this.sendErrorResponse(source, data.requestId, error);
            }
        }

        handleAddLodge(source, data) {
            try {
                if (!this.isAdmin) {
                    throw new Error('Authentication required');
                }
                
                if (!window.LodgeEasePublicAPI) {
                    throw new Error('Lodge API not available');
                }
                
                const result = window.LodgeEasePublicAPI.addNewLodge(data.lodge);
                
                this.sendResponse(source, {
                    type: 'LODGEEASE_CLIENT',
                    action: 'LODGE_ADDED',
                    requestId: data.requestId,
                    success: result,
                    lodgeId: data.lodge.id
                });
            } catch (error) {
                this.sendErrorResponse(source, data.requestId, error);
            }
        }

        handleUpdateLodge(source, data) {
            try {
                if (!this.isAdmin) {
                    throw new Error('Authentication required');
                }
                
                if (!window.LodgeEasePublicAPI) {
                    throw new Error('Lodge API not available');
                }
                
                const result = window.LodgeEasePublicAPI.updateLodge(data.lodgeId, data.updatedData);
                
                this.sendResponse(source, {
                    type: 'LODGEEASE_CLIENT',
                    action: 'LODGE_UPDATED',
                    requestId: data.requestId,
                    success: result,
                    lodgeId: data.lodgeId
                });
            } catch (error) {
                this.sendErrorResponse(source, data.requestId, error);
            }
        }

        handleRemoveLodge(source, data) {
            try {
                if (!this.isAdmin) {
                    throw new Error('Authentication required');
                }
                
                if (!window.LodgeEasePublicAPI) {
                    throw new Error('Lodge API not available');
                }
                
                const result = window.LodgeEasePublicAPI.removeLodge(data.lodgeId);
                
                this.sendResponse(source, {
                    type: 'LODGEEASE_CLIENT',
                    action: 'LODGE_REMOVED',
                    requestId: data.requestId,
                    success: result,
                    lodgeId: data.lodgeId
                });
            } catch (error) {
                this.sendErrorResponse(source, data.requestId, error);
            }
        }

        handleAuthenticate(source, data) {
            // Simple authentication for demo
            // In production, use a proper authentication token system
            if (data.token === 'lodgeease-admin-token') {
                this.isAdmin = true;
                this.sendResponse(source, {
                    type: 'LODGEEASE_CLIENT',
                    action: 'AUTHENTICATED',
                    requestId: data.requestId,
                    success: true
                });
                logger.log('Admin authenticated successfully');
            } else {
                this.isAdmin = false;
                this.sendResponse(source, {
                    type: 'LODGEEASE_CLIENT',
                    action: 'AUTHENTICATED',
                    requestId: data.requestId,
                    success: false,
                    error: 'Invalid authentication token'
                });
                logger.warn('Failed admin authentication attempt');
            }
        }

        sendResponse(targetWindow, data) {
            try {
                targetWindow.postMessage(data, '*');
            } catch (error) {
                logger.error('Error sending response:', error);
            }
        }

        sendErrorResponse(targetWindow, requestId, error) {
            this.sendResponse(targetWindow, {
                type: 'LODGEEASE_CLIENT',
                action: 'ERROR',
                requestId: requestId,
                success: false,
                error: error.message || 'Unknown error occurred'
            });
        }
    }

    // Initialize the connector when the document is loaded
    document.addEventListener('DOMContentLoaded', () => {
        window.adminConnector = new AdminConnector();
        logger.log('Admin connector initialized and ready');
    });
    
    // Expose connector globally for debugging
    window.LodgeEaseAdminConnector = AdminConnector;
})();
