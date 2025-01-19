import { auth, db } from '../firebase.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";
import { chartDataService } from './chartDataService.js';

new Vue({
    el: '#app',
    data: {
        isAuthenticated: false,
        loading: {
            charts: true,
            data: true
        },
        error: null,
        charts: {
            roomTypes: null,
            occupancy: null,
            bookings: null,
            revenue: null,
            satisfaction: null
        },
        analyticsData: {
            roomTypes: {},
            occupancy: [],
            bookings: [],
            revenue: [],
            satisfaction: []
        },
        dateRange: 'month', // 'week', 'month', 'year'
        selectedEstablishment: 'all'
    },
    methods: {
        async checkAuthState() {
            // ...existing auth check code...
        },

        async initializeCharts() {
            try {
                const data = await chartDataService.getChartData('all');
                
                const chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    family: 'Montserrat',
                                    size: 12
                                },
                                padding: 20
                            }
                        },
                        title: {
                            display: false
                        }
                    }
                };

                const colors = {
                    primary: '#1e3c72',
                    secondary: '#2a5298',
                    accent1: '#2ecc71',
                    accent2: '#3498db',
                    accent3: '#e74c3c'
                };

                // Room Types Chart
                const roomTypesCtx = document.getElementById('roomTypesChart').getContext('2d');
                this.charts.roomTypes = new Chart(roomTypesCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(data.roomTypes),
                        datasets: [{
                            data: Object.values(data.roomTypes),
                            backgroundColor: [colors.primary, colors.secondary, colors.accent1, colors.accent2]
                        }]
                    },
                    options: {
                        ...chartOptions,
                        cutout: '60%'
                    }
                });

                // Occupancy Chart
                const occupancyCtx = document.getElementById('occupancyChart').getContext('2d');
                this.charts.occupancy = new Chart(occupancyCtx, {
                    type: 'line',
                    data: {
                        labels: data.occupancy.map(d => d.month),
                        datasets: [{
                            label: 'Occupancy Rate',
                            data: data.occupancy.map(d => d.rate),
                            borderColor: colors.primary,
                            backgroundColor: 'rgba(30, 60, 114, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        ...chartOptions,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });

                // Rest of chart initializations with similar styling...
                
                this.loading.charts = false;
            } catch (error) {
                console.error('Error initializing charts:', error);
                this.error = 'Failed to initialize charts';
                this.loading.charts = false;
            }
        },

        async updateCharts() {
            try {
                const data = await chartDataService.getChartData('all', true);
                
                Object.keys(this.charts).forEach(chartKey => {
                    if (this.charts[chartKey] && data[chartKey]) {
                        this.charts[chartKey].data = data[chartKey];
                        this.charts[chartKey].update();
                    }
                });
            } catch (error) {
                console.error('Error updating charts:', error);
                this.error = 'Failed to update charts';
            }
        },

        async exportReport(format) {
            try {
                const data = await chartDataService.getChartData('all');
                if (format === 'pdf') {
                    this.exportPDF(data);
                } else {
                    this.exportCSV(data);
                }
            } catch (error) {
                console.error('Error exporting report:', error);
                this.error = 'Failed to export report';
            }
        },

        exportPDF(data) {
            const doc = new jsPDF();
            doc.text('Business Analytics Report', 20, 10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 20);
            // Add more PDF content...
            doc.save('business-analytics-report.pdf');
        },

        exportCSV(data) {
            const csvContent = `Date,Metric,Value\n${
                Object.entries(data).map(([key, value]) => 
                    `${new Date().toISOString()},${key},${value}`
                ).join('\n')
            }`;
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'business-analytics-report.csv';
            a.click();
        },

        updateDateRange(range) {
            this.dateRange = range;
            this.updateCharts();
        },

        updateEstablishment(establishment) {
            this.selectedEstablishment = establishment;
            this.updateCharts();
        }
    },
    async mounted() {
        await this.checkAuthState();
        await this.initializeCharts();
        
        // Set up auto-refresh every 5 minutes
        setInterval(() => {
            this.updateCharts();
        }, 5 * 60 * 1000);
    }
});
