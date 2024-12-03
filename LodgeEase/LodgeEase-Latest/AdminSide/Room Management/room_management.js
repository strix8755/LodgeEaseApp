import { fetchRoomsData, fetchRoomById, addRoom, updateRoom, deleteRoom } from '../firebase.js';

// To store the room data in memory
let roomsDataCache = [];

// Utility Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error(`Modal with ID "${modalId}" not found.`);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    } else {
        console.error(`Modal with ID "${modalId}" not found.`);
    }
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    } else {
        console.error(`Form with ID "${formId}" not found.`);
    }
}

// Function to generate a row based on room data
function generateRoomRow(room) {
    return `
        <tr>
            <td>${room.roomNumber || 'N/A'}</td>
            <td>${room.type || 'N/A'}</td>
            <td>${room.floor || 'N/A'}</td>
            <td>${room.currentGuest || 'N/A'}</td>
            <td>${room.checkIn || 'Not checked in'}</td>
            <td>${room.checkOut || 'Not checked out'}</td>
            <td>${room.status || 'Unknown'}</td>
            <td>
                <button class="edit-btn" data-id="${room.id}">Edit</button>
                <button class="delete-btn" data-id="${room.id}">Delete</button>
            </td>
        </tr>`;
}

// Display rooms in the table
function displayRooms(rooms) {
    const roomDataContainer = document.getElementById('roomData');
    roomDataContainer.innerHTML = ''; // Clear existing rows

    if (rooms.length === 0) {
        roomDataContainer.innerHTML = '<tr><td colspan="8">No rooms found.</td></tr>';
        return;
    }

    rooms.forEach(room => {
        roomDataContainer.innerHTML += generateRoomRow(room);
    });

    attachRowEventListeners(); // Reattach event listeners after rendering
}

// Populate filter options dynamically
function populateFilters(rooms) {
    const filters = {
        room: document.getElementById('filter-room'),
        type: document.getElementById('filter-type'),
        floor: document.getElementById('filter-floor'),
        guest: document.getElementById('filter-guest'),
        status: document.getElementById('filter-status'),
    };

    // Clear existing filter options
    Object.values(filters).forEach(filter => {
        if (filter) {
            filter.innerHTML = '<option value="">All</option>'; // Reset options
        }
    });

    const roomAttributes = {
        room: new Set(),
        type: new Set(),
        floor: new Set(),
        guest: new Set(),
        status: new Set(),
    };

    rooms.forEach(room => {
        roomAttributes.room.add(room.roomNumber || 'N/A');
        roomAttributes.type.add(room.type || 'N/A');
        roomAttributes.floor.add(room.floor || 'N/A');
        roomAttributes.guest.add(room.currentGuest || 'N/A');
        roomAttributes.status.add(room.status || 'N/A');
    });

    // Dynamically create filter options for each attribute
    Object.entries(filters).forEach(([key, filter]) => {
        if (filter && roomAttributes[key]) {
            roomAttributes[key].forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                filter.appendChild(option);
            });
        }
    });
}

// Apply filters to room data (strictly search by room number)
function applyFilters() {
    const searchQuery = document.getElementById('search-for-rooms') ? document.getElementById('search-for-rooms').value.trim().toLowerCase() : '';

    // Check if the search query is numeric
    const isNumericSearch = !isNaN(searchQuery) && searchQuery !== '';

    const filteredRooms = roomsDataCache.filter(room => {
        // Normalize room data to lowercase for consistent comparison
        const roomNumber = (room.roomNumber || '').toString().toLowerCase().trim();

        // If the search is numeric, match only room number
        if (isNumericSearch) {
            return roomNumber === searchQuery;
        }

        // Otherwise, check if the search query matches any value in the room object
        return Object.values(room).some(value =>
            (value || '').toString().toLowerCase().includes(searchQuery)
        );
    });

    displayRooms(filteredRooms);
}

// Attach search listener
function attachSearchListener() {
    const searchBar = document.getElementById('search-for-rooms');
    if (searchBar) {
        searchBar.addEventListener('input', applyFilters);
    } else {
        console.error('Search bar not found.');
    }
}

// Load room data from Firebase
async function loadRoomData() {
    try {
        const roomsData = await fetchRoomsData();
        roomsDataCache = roomsData;
        populateFilters(roomsData);
        applyFilters();
    } catch (error) {
        console.error("Error loading room data:", error);
        alert("Failed to load room data. Please try again.");
    }
}


// Function to prepare room data for the dashboard
// In room_management.js
export async function sendRoomDataToDashboard() {
    try {
        const roomsData = await fetchRoomsData();

        // Calculate relevant metrics
        const totalRooms = roomsData.length;
        const availableRooms = roomsData.filter(room => room.status === "Available").length;
        const occupiedRooms = roomsData.filter(room => room.status === "Occupied").length;

        const recentCheckIns = roomsData
            .filter(room => room.status === "Occupied")
            .map(room => ({
                roomNumber: room.roomNumber,
                guestName: room.currentGuest,
                checkInDate: room.checkIn,
            }))
            .slice(0, 5); // Latest 5 check-ins

        // Return an object containing the room data
        return { totalRooms, availableRooms, occupiedRooms, recentCheckIns };
    } catch (error) {
        console.error("Error preparing room data for dashboard:", error);
        throw error; // Re-throw the error to handle it at the call site
    }
}

// Attach event listeners for room rows
function attachRowEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => editRoom(button.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => handleDeleteRoom(button.dataset.id));
    });
}

// Attach event listeners for filters
function attachFilterListeners() {
    document.querySelectorAll('.filter').forEach(filter =>
        filter.addEventListener('change', applyFilters)
    );
}

// Attach modal close event listener
function attachModalCloseListener() {
    document.getElementById('close-modal')?.addEventListener('click', () => hideModal('add-room-modal'));
}

const formFields = ['room-number', 'room-type', 'room-floor', 'room-status', 'check-in', 'check-out'];

// Edit Room Function
async function editRoom(roomId) {
    try {
        const roomData = await fetchRoomById(roomId);
        if (!roomData) throw new Error(`Room with ID ${roomId} not found.`);

        const fieldMappings = {
            'room-number': 'roomNumber',
            'room-type': 'type',
            'room-floor': 'floor',
            'room-status': 'status',
            'check-in': 'checkIn',
            'check-out': 'checkOut',
        };

        // Populate form fields with room data
        formFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            const key = fieldMappings[fieldId];
            if (input) input.value = roomData[key] || '';
        });

        showModal('add-room-modal');

        // Set up the form submission for editing only
        document.getElementById('add-room-form').onsubmit = async function (e) {
            e.preventDefault();

            const updatedRoom = formFields.reduce((acc, fieldId) => {
                const key = fieldMappings[fieldId];
                acc[key] = document.getElementById(fieldId).value;
                return acc;
            }, {});

            try {
                // Ensure this function only updates the existing room
                await updateRoom(roomId, updatedRoom);
                loadRoomData(); // Refresh data to show updated room
                hideModal('add-room-modal');
            } catch (error) {
                console.error("Error updating room:", error);
                alert("Failed to update room.");
            }
        };
    } catch (error) {
        console.error("Error editing room:", error);
        alert("Failed to load room details.");
    }
}

// Delete room
async function handleDeleteRoom(roomId) {
    try {
        await deleteRoom(roomId);
        loadRoomData();
    } catch (error) {
        console.error("Error deleting room:", error);
        alert("Failed to delete room.");
    }
}

function setupAddRoomButton() {
    document.getElementById('button-rooms-add')?.addEventListener('click', () => {
        resetForm('add-room-form');
        showModal('add-room-modal');

        // Remove any previous submit event listeners before adding a new one
        document.getElementById('add-room-form').onsubmit = async function (e) {
            e.preventDefault();

            const fieldMappings = {
                'room-number': 'roomNumber',
                'room-type': 'type',
                'room-floor': 'floor',
                'room-status': 'status',
                'check-in': 'checkIn',
                'check-out': 'checkOut',
            };

            // Create a new room object based on the input fields and field mappings
            const newRoom = Object.entries(fieldMappings).reduce((acc, [fieldId, key]) => {
                const input = document.getElementById(fieldId);
                acc[key] = input ? input.value : null;
                return acc;
            }, {});

            try {
                console.log("New Room Data:", newRoom); // Debugging: Log the new room data
                await addRoom(newRoom);
                loadRoomData();
                hideModal('add-room-modal');
            } catch (error) {
                console.error("Error adding room:", error);
                alert("Failed to add room.");
            }
        };
    });
}

// Call loadRoomData on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    loadRoomData();
    attachSearchListener();
    attachFilterListeners();
    attachModalCloseListener();
    setupAddRoomButton();
});
