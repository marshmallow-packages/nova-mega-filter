<template>
    <Card class="transition rounded nova-mega-filter" :style="{ '--columns-desktop': columns || 2 }"
        :class="{ '--expanded': collapsed }">
        <div :class="{ 'h-14': collapsed, 'h-14': !collapsed }"
            class="flex items-center w-full py-2 transition-all filter__header">
            <div class="flex items-center justify-between w-full px-2 md:px-4 min-h-14">
                <div class="flex items-center justify-start w-full ml-1 text-base cursor-pointer"
                    @click.prevent="toggleCollapse">
                    <p class="text-base font-bold tracking-wide text-left dark:text-white whitespace-nowrap">
                        {{ filtersTitle }}
                    </p>
                    <Icon :type="collapsed ? 'chevron-up' : 'chevron-down'" class="ml-1 text-gray-400" width="16" />
                </div>
                <div class="flex items-center justify-end shrink-0 gap-x-4">
                    <Button v-if="filtersAreApplied" variant="ghost" class="" :label="__('Reset filters')"
                        @click.prevent="clearFilters" />

                    <Button :variant="filtersAreApplied ? 'solid' : 'ghost'" icon="funnel" :trailing-icon="collapsed ? 'chevron-up' : 'chevron-down'
                        " padding="tight" class="dark:text-gray-200"
                        :label="activeFilterCount > 0 ? activeFilterCount : ''" :aria-label="__('Mega Filter')"
                        @click.prevent="toggleCollapse" />
                </div>
            </div>
        </div>

        <Collapse :when="collapsed">
            <div class="p-2 overflow-visible rounded-b md:p-4 filter__inner dark:bg-gray-900">
                <div v-if="filters.length">
                    <div class="flex flex-wrap">
                        <div v-for="filter in syncedFilters" :key="filter.name" class="relative filter__loop"
                            :class="filter.width">
                            <!-- Loading overlay for each individual filter -->
                            <div v-if="loadingFilters[filter.class]"
                                class="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-70 dark:bg-gray-800 dark:bg-opacity-80">
                                <svg class="w-6 h-6 animate-spin text-primary-500" xmlns="http://www.w3.org/2000/svg"
                                    fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                            </div>
                            <component :is="filter.component" :filter-key="filter.class" :lens="lens"
                                :resource-name="resourceName" :key="`filter-${filter.class}-${refreshKey}`"
                                @change="onChange(filter.class)" @input="onChange(filter.class)" />
                        </div>
                    </div>
                </div>
            </div>
        </Collapse>
    </Card>
</template>

<script>
import { Filterable, InteractsWithQueryString } from "laravel-nova-mixins";
import { Button } from "laravel-nova-ui";
import { Collapse } from "vue-collapsed";
import { filtersAreApplied, megaFilterOnly } from "./MegaFilter";

export default {
    name: "MegaFilter",
    components: { Collapse, Button },
    mixins: [Filterable, InteractsWithQueryString],
    emits: ["filter-changed", "clear-selected-filters"],
    props: {
        filters: Array,
        columns: { type: Number, default: 2 },
        open: { type: Boolean, default: false },
        resourceName: String,
        viaResource: String,
        viaResourceId: [Number, String],
        viaRelationship: String,
        activeFilterCount: Number,
    },
    data() {
        return {
            collapsed: false,
            loadingFilters: {},
            refreshKey: 0,
            syncedFilters: [],
        };
    },
    methods: {
        clearFilters() {
            this.clearSelectedFilters();
            this.collapsed = false;
        },
        onChange(filterKey) {
            // Use direct property assignment instead of Vue.set
            this.loadingFilters = {
                ...this.loadingFilters,
                [filterKey]: true,
            };

            this.filterChanged();

            // Remove loading state after a short delay
            setTimeout(() => {
                this.loadingFilters = {
                    ...this.loadingFilters,
                    [filterKey]: false,
                };
            }, 500);
        },
        toggleCollapse() {
            this.collapsed = !this.collapsed;
        },
        refreshFilter() {
            this.refreshKey += 1; // Force filter components to re-render
            this.updateSyncedFilters();
        },
        updateSyncedFilters() {
            // Get the latest filter data from the store
            if (this.resourceName) {
                const storeFilters =
                    this.$store.getters[
                        `${this.resourceName}/filters`
                    ].filter(megaFilterOnly);
                this.syncedFilters = storeFilters;
            } else {
                this.syncedFilters = this.filters;
            }
        },
    },
    computed: {
        filtersAreApplied() {
            return filtersAreApplied(
                this.$store,
                this.resourceName,
                megaFilterOnly
            );
        },
        initialEncodedFilters() {
            return this.queryStringParams[this.filterParameter] || "";
        },
        pageParameter() {
            return this.viaRelationship
                ? this.viaRelationship + "_page"
                : this.resourceName + "_page";
        },
        activeFilterCount() {
            return filtersAreApplied(
                this.$store,
                this.resourceName,
                megaFilterOnly
            );
        },
        filtersTitle() {
            if (this.resourceName) {
                // Get the resource name, ensure first letter is uppercase and remove trailing 's' if present
                const resourceName =
                    this.resourceName.charAt(0).toUpperCase() +
                    this.resourceName.slice(1);
                const singularName = resourceName.endsWith("s")
                    ? resourceName.slice(0, -1)
                    : resourceName;
                return `${singularName} filters`;
            }
            return "Filters";
        },
    },
    async created() {
        await this.initializeState();

        // Initialize synced filters
        this.updateSyncedFilters();

        // Listen for filter updates from default Nova filter menu
        Nova.$on("mega-filter-update", () => {
            this.updateSyncedFilters();
            this.refreshFilter();
        });

        // Listen for Nova's filter change events
        Nova.$on("filter-changed", () => {
            this.updateSyncedFilters();
        });
    },
    beforeMount() {
        this.collapsed = this.open ? this.open : this.filtersAreApplied;
    },
    beforeDestroy() {
        // Clean up event listeners
        Nova.$off("mega-filter-update");
    },
};
</script>

<style>
.nova-mega-filter {
    @apply overflow-visible;
    --columns-mobile: 1;
    --columns-desktop: 2;
}

/* Base styling */
.nova-mega-filter .filter__inner {
    @apply bg-white;
}

.nova-mega-filter .filter__header {
    @apply text-gray-500 h-14;
}

.nova-mega-filter .filter__loop {
    @apply border border-transparent rounded transition-all bg-white;
    width: calc(100% / var(--columns-mobile));
}

.nova-mega-filter .filter__loop:hover {
    @apply border-gray-200 bg-gray-50 bg-opacity-50;
}

/* Expanded state */
.nova-mega-filter.\--expanded {
    @apply bg-gray-50;
}

.nova-mega-filter .filter__inner {
    @apply border border-gray-100;
}

/* Active state */
.nova-mega-filter.\--active .filter__header {
    @apply text-white;
}

/* Dark mode */
.dark .nova-mega-filter .filter__inner {
    @apply bg-gray-900 border-gray-700 border;
}

.dark .nova-mega-filter .filter__header {
    @apply text-gray-400;
}

.dark .nova-mega-filter .filter__loop:hover {
    @apply border-gray-600 bg-gray-700 bg-opacity-50;
}

.dark .nova-mega-filter.\--expanded {
    @apply border border-gray-700;
    background-color: rgba(var(--colors-gray-800));
}

.dark .nova-mega-filter.\--active {
    background-color: rgba(var(--colors-gray-600));
}

.dark .nova-mega-filter.\--active .filter__header {
    @apply text-gray-800;
}

.dark .nova-mega-filter .filter__loop {
    @apply border border-transparent rounded transition-all w-full bg-gray-800;
}

/* Responsive */
@screen lg {
    .nova-mega-filter .filter__loop {
        width: calc(100% / var(--columns-desktop) - 2px);
    }

    .dark .nova-mega-filter .filter__loop {
        width: calc(100% / var(--columns-desktop) - 2px);
    }
}

.w-0 {
    width: 0px !important;
}

.w-px {
    width: 1px !important;
}

.w-0.5 {
    width: 0.125rem !important;
    /* 2px */
}

.w-1 {
    width: 0.25rem !important;
    /* 4px */
}

.w-1.5 {
    width: 0.375rem !important;
    /* 6px */
}

.w-2 {
    width: 0.5rem !important;
    /* 8px */
}

.w-2.5 {
    width: 0.625rem !important;
    /* 10px */
}

.w-3 {
    width: 0.75rem !important;
    /* 12px */
}

.w-3.5 {
    width: 0.875rem !important;
    /* 14px */
}

.w-4 {
    width: 1rem !important;
    /* 16px */
}

.w-5 {
    width: 1.25rem !important;
    /* 20px */
}

.w-6 {
    width: 1.5rem !important;
    /* 24px */
}

.w-7 {
    width: 1.75rem !important;
    /* 28px */
}

.w-8 {
    width: 2rem !important;
    /* 32px */
}

.w-9 {
    width: 2.25rem !important;
    /* 36px */
}

.w-10 {
    width: 2.5rem !important;
    /* 40px */
}

.w-11 {
    width: 2.75rem !important;
    /* 44px */
}

.w-12 {
    width: 3rem !important;
    /* 48px */
}

.w-14 {
    width: 3.5rem !important;
    /* 56px */
}

.w-16 {
    width: 4rem !important;
    /* 64px */
}

.w-20 {
    width: 5rem !important;
    /* 80px */
}

.w-24 {
    width: 6rem !important;
    /* 96px */
}

.w-28 {
    width: 7rem !important;
    /* 112px */
}

.w-32 {
    width: 8rem !important;
    /* 128px */
}

.w-36 {
    width: 9rem !important;
    /* 144px */
}

.w-40 {
    width: 10rem !important;
    /* 160px */
}

.w-44 {
    width: 11rem !important;
    /* 176px */
}

.w-48 {
    width: 12rem !important;
    /* 192px */
}

.w-52 {
    width: 13rem !important;
    /* 208px */
}

.w-56 {
    width: 14rem !important;
    /* 224px */
}

.w-60 {
    width: 15rem !important;
    /* 240px */
}

.w-64 {
    width: 16rem !important;
    /* 256px */
}

.w-72 {
    width: 18rem !important;
    /* 288px */
}

.w-80 {
    width: 20rem !important;
    /* 320px */
}

.w-96 {
    width: 24rem !important;
    /* 384px */
}

.w-auto {
    width: auto !important;
}

.w-1\/2 {
    width: 50% !important;
}

.w-1\/3 {
    width: 33.333333% !important;
}

.w-2\/3 {
    width: 66.666667% !important;
}

.w-1\/4 {
    width: 25% !important;
}

.w-2\/4 {
    width: 50% !important;
}

.w-3\/4 {
    width: 75% !important;
}

.w-1\/5 {
    width: 20% !important;
}

.w-2\/5 {
    width: 40% !important;
}

.w-3\/5 {
    width: 60% !important;
}

.w-4\/5 {
    width: 80% !important;
}

.w-1\/6 {
    width: 16.666667% !important;
}

.w-2\/6 {
    width: 33.333333% !important;
}

.w-3\/6 {
    width: 50% !important;
}

.w-4\/6 {
    width: 66.666667% !important;
}

.w-5\/6 {
    width: 83.333333% !important;
}

.w-1\/12 {
    width: 8.333333% !important;
}

.w-2\/12 {
    width: 16.666667% !important;
}

.w-3\/12 {
    width: 25% !important;
}

.w-4\/12 {
    width: 33.333333% !important;
}

.w-5\/12 {
    width: 41.666667% !important;
}

.w-6\/12 {
    width: 50% !important;
}

.w-7\/12 {
    width: 58.333333% !important;
}

.w-8\/12 {
    width: 66.666667% !important;
}

.w-full {
    width: 100% !important;
}
</style>
