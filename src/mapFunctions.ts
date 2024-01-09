import mapboxgl from "mapbox-gl";

function getMapboxLayersForLegend(
  map: mapboxgl.Map,
  mapLegendLayerIds: string
): mapboxgl.Layer[] {
  const layerIds = mapLegendLayerIds.split(",");
  const matchingLayers: mapboxgl.Layer[] = [];

  layerIds.forEach((layerId) => {
    layerId = layerId.trim();

    // Check if the map has this layer
    const layer: mapboxgl.Layer | undefined = map.getLayer(layerId);

    if (layer) {
      // Get the layer object and add it to the matchingLayers array
      matchingLayers.push(layer);
    } else {
      console.warn(`Layer with ID "${layerId}" not found.`);
    }
  });

  return matchingLayers;
}

export function prepareMapLegendLayers(map: mapboxgl.Map, mapLegendLayerIds: string | null): any[] | undefined {
    if (!mapLegendLayerIds || !map.isStyleLoaded()) {
        return;
    }
  
    const mapboxLayersForLegend = getMapboxLayersForLegend(map, mapLegendLayerIds);  
  
    // Prepare object with type, id, and color for each layer in the map legend
    const mapLegendContent = mapboxLayersForLegend.map(layer => {
      const layerId = layer.id;
      const layerType = layer.type;
      const layerColor = map.getPaintProperty(layerId, `${layerType}-color`);
      return {
        id: layerId,
        type: layerType,
        color: layerColor
      };
    });

    if (mapLegendContent.length === 0) {
      return;
    }

    return mapLegendContent;
  }