<template>
  <div class="map-legend feature p-4 rounded-lg shadow-lg">
    <h2 class="text-2xl font-semibold mb-2">Map Legend</h2>
    <div v-for="item in mapLegendContent" :key="item.id" class="legend-item">
      <div :class="['color-box', getTypeClass(item)]" :style="{ backgroundColor: item.color }"></div>
      <span>{{ formatId(item.id) }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: ["mapLegendContent"],
  methods: {
    getTypeClass(item) {
      return `${item.type}-box`;
    },
    formatId(id) {
      return id.replace(/-/g, ' ')
               .replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    }
  }
};
</script>

<style scoped>
.map-legend {
  position: absolute;
  bottom: 30px;
  right: 10px;
  max-width: 300px;
  background-color: #fff;
  padding: 20px;
  line-height: 18px;
  overflow-y: auto;
  z-index: 1000;
}

.color-box {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 10px;
  vertical-align: middle;
  position: relative;
}

.fill-box {
}

.line-box {
  display: inline-block;
  width: 20px; 
  height: 3px!important; 
  transform: translateY(-50%);
}

.circle-box {
  border-radius: 50%;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

@media (max-width: 768px) {
  .map-legend {
    display: none;
  }
}
</style>