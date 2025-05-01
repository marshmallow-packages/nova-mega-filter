<template>

    <MegaFilter class="nova-mega-filter" :lens="lens" :filters="card.filters" :columns="card.columns" :open="card.open"
        :resource-name="resourceName" :via-resource="viaResource" :via-resource-id="viaResourceId"
        :via-relationship="viaRelationship" :active-filter-count="activeFilterCount" />

</template>

<script>

import MegaFilter from './MegaFilter.vue'
import { filtersAreApplied, megaFilterOnly } from './MegaFilter'

export default {
    name: 'MegaFilterCard',
    components: { MegaFilter },
    props: [
        'card',
        'lens',
        'resourceName',
        'viaResource',
        'viaResourceId',
        'viaRelationship',
    ],
    computed: {
        activeFilterCount() {
            return filtersAreApplied(this.$store, this.resourceName, megaFilterOnly)
        }
    },
    created() {

        const standardFilters = this.$store.getters[`${this.resourceName}/originalFilters`]
        const merged = standardFilters.concat(this.card.filters.map(filter => ({ ...filter, megaFilter: true })))

        this.$store.commit(`${this.resourceName}/storeFilters`, merged)

    },
}

</script>

<style>
.nova-mega-filter {
    min-height: auto;
    padding-top: 0;
}
</style>
