import reduce from "lodash/reduce";

export function filtersAreApplied(store, resourceName, filterFunction) {
    const filters =
        store.getters[`${resourceName}/filters`].filter(filterFunction);

    return reduce(
        filters,
        (result, filter) => {
            const originalFilter = store.getters[
                `${resourceName}/getOriginalFilter`
            ](filter.class);
            const originalFilterCloneValue = JSON.stringify(
                originalFilter.currentValue
            );
            const currentFilterCloneValue = JSON.stringify(filter.currentValue);
            return currentFilterCloneValue === originalFilterCloneValue
                ? result
                : result + 1;
        },
        0
    );
}

export function withoutMegaFilter(filter) {
    return filter.megaFilter !== true;
}

export function megaFilterOnly(filter) {
    return filter.megaFilter === true;
}

export function registerMixin(component) {
    const filters = component.computed.filters;

    component.computed.filters = function () {
        return filters.call(this).filter(withoutMegaFilter);
    };

    component.computed.activeFilterCount = function () {
        return filtersAreApplied(
            this.$store,
            this.resourceName,
            withoutMegaFilter
        );
    };

    component.computed.filtersAreApplied = function () {
        return this.activeFilterCount > 0;
    };

    // Save the original created hook if it exists
    const originalCreated = component.created || function () {};

    // Extend the created hook to listen for filter changes
    component.created = function () {
        // Call the original created hook
        originalCreated.call(this);
        ``;
        // Listen for filter-changed events from Nova
        Nova.$on("filter-changed", () => {
            // Force refresh the filters
            this.$forceUpdate();

            // Emit our own event that MegaFilter can listen for
            Nova.$emit("mega-filter-update");
        });
    };
}
