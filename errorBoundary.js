Vue.component('error-boundary', {
    props: ['fallbackComponent'],
    data() {
        return {
            hasError: false,
            error: null
        };
    },
    errorCaptured(err, vm, info) {
        this.hasError = true;
        this.error = {
            message: err.message,
            stack: err.stack,
            info: info
        };
        return false; // Stop error propagation
    },
    render(h) {
        if (this.hasError) {
            return h(this.fallbackComponent || 'div', {
                props: { error: this.error }
            });
        }
        return this.$slots.default[0];
    }
});
