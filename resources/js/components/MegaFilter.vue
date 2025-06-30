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

/* Scoped width utilities using Tailwind's @apply directive */
@screen md {
    .nova-mega-filter .w-0 {
        @apply !w-0;
    }

    .nova-mega-filter .w-px {
        @apply !w-px;
    }

    .nova-mega-filter .w-0\.5 {
        @apply !w-0.5;
    }

    .nova-mega-filter .w-1 {
        @apply !w-1;
    }

    .nova-mega-filter .w-1\.5 {
        @apply !w-1.5;
    }

    .nova-mega-filter .w-2 {
        @apply !w-2;
    }

    .nova-mega-filter .w-2\.5 {
        @apply !w-2.5;
    }

    .nova-mega-filter .w-3 {
        @apply !w-3;
    }

    .nova-mega-filter .w-3\.5 {
        @apply !w-3.5;
    }

    .nova-mega-filter .w-4 {
        @apply !w-4;
    }

    .nova-mega-filter .w-5 {
        @apply !w-5;
    }

    .nova-mega-filter .w-6 {
        @apply !w-6;
    }

    .nova-mega-filter .w-7 {
        @apply !w-7;
    }

    .nova-mega-filter .w-8 {
        @apply !w-8;
    }

    .nova-mega-filter .w-9 {
        @apply !w-9;
    }

    .nova-mega-filter .w-10 {
        @apply !w-10;
    }

    .nova-mega-filter .w-11 {
        @apply !w-11;
    }

    .nova-mega-filter .w-12 {
        @apply !w-12;
    }

    .nova-mega-filter .w-14 {
        @apply !w-14;
    }

    .nova-mega-filter .w-16 {
        @apply !w-16;
    }

    .nova-mega-filter .w-20 {
        @apply !w-20;
    }

    .nova-mega-filter .w-24 {
        @apply !w-24;
    }

    .nova-mega-filter .w-28 {
        @apply !w-28;
    }

    .nova-mega-filter .w-32 {
        @apply !w-32;
    }

    .nova-mega-filter .w-36 {
        @apply !w-36;
    }

    .nova-mega-filter .w-40 {
        @apply !w-40;
    }

    .nova-mega-filter .w-44 {
        @apply !w-44;
    }

    .nova-mega-filter .w-48 {
        @apply !w-48;
    }

    .nova-mega-filter .w-52 {
        @apply !w-52;
    }

    .nova-mega-filter .w-56 {
        @apply !w-56;
    }

    .nova-mega-filter .w-60 {
        @apply !w-60;
    }

    .nova-mega-filter .w-64 {
        @apply !w-64;
    }

    .nova-mega-filter .w-72 {
        @apply !w-72;
    }

    .nova-mega-filter .w-80 {
        @apply !w-80;
    }

    .nova-mega-filter .w-96 {
        @apply !w-96;
    }

    .nova-mega-filter .w-auto {
        @apply !w-auto;
    }

    .nova-mega-filter .w-1\/2 {
        @apply !w-1/2;
    }

    .nova-mega-filter .w-1\/3 {
        @apply !w-1/3;
    }

    .nova-mega-filter .w-2\/3 {
        @apply !w-2/3;
    }

    .nova-mega-filter .w-1\/4 {
        @apply !w-1/4;
    }

    .nova-mega-filter .w-2\/4 {
        @apply !w-2/4;
    }

    .nova-mega-filter .w-3\/4 {
        @apply !w-3/4;
    }

    .nova-mega-filter .w-1\/5 {
        @apply !w-1/5;
    }

    .nova-mega-filter .w-2\/5 {
        @apply !w-2/5;
    }

    .nova-mega-filter .w-3\/5 {
        @apply !w-3/5;
    }

    .nova-mega-filter .w-4\/5 {
        @apply !w-4/5;
    }

    .nova-mega-filter .w-1\/6 {
        @apply !w-1/6;
    }

    .nova-mega-filter .w-2\/6 {
        @apply !w-2/6;
    }

    .nova-mega-filter .w-3\/6 {
        @apply !w-3/6;
    }

    .nova-mega-filter .w-4\/6 {
        @apply !w-4/6;
    }

    .nova-mega-filter .w-5\/6 {
        @apply !w-5/6;
    }

    .nova-mega-filter .w-1\/12 {
        @apply !w-1/12;
    }

    .nova-mega-filter .w-2\/12 {
        @apply !w-2/12;
    }

    .nova-mega-filter .w-3\/12 {
        @apply !w-3/12;
    }

    .nova-mega-filter .w-4\/12 {
        @apply !w-4/12;
    }

    .nova-mega-filter .w-5\/12 {
        @apply !w-5/12;
    }

    .nova-mega-filter .w-6\/12 {
        @apply !w-6/12;
    }

    .nova-mega-filter .w-7\/12 {
        @apply !w-7/12;
    }

    .nova-mega-filter .w-8\/12 {
        @apply !w-8/12;
    }
}
</style>
