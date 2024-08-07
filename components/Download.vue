<template>
  <div class="button-container">
    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mx-2"
      @click="
        typeOfData === 'alert' ? downloadAlertCSV() : downloadCSVSelection()
      "
    >
      {{ $t("downloadCSV") }}
    </button>
    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mx-2"
      @click="
        typeOfData === 'alert'
          ? downloadAlertGeoJSON()
          : downloadGeoJSONSelection()
      "
    >
      {{ $t("downloadGeoJSON") }}
    </button>
    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mx-2"
      @click="
        typeOfData === 'alert' ? downloadAlertKML() : downloadKMLSelection()
      "
    >
      {{ $t("downloadKML") }}
    </button>
  </div>
</template>

<script>
import tokml from "tokml";

export default {
  props: ["geojson", "typeOfData"],
  methods: {
    downloadAlertCSV() {
      // Convert featureObject to CSV and download
      if (!this.geojson) {
        console.error(
          "No GeoJSON data available to download and convert to CSV.",
        );
        return;
      }

      // Flatten the object
      const { geometry, properties } = this.geojson;
      let flattened = { ...properties }; // Start with properties

      // Ensure that all coordinate properties render well in CSV
      flattened["geographicCentroid"] = `[${properties["geographicCentroid"]}]`;
      const coordinates = JSON.stringify(geometry.coordinates);
      delete flattened["coordinates"];
      delete flattened["YYYYMM"];

      // Generate CSV data
      const csvColumns = Object.keys(flattened);
      const csvData = Object.values(flattened).map((value) =>
        typeof value === "string" && value.includes(",")
          ? `"${value.replace(/"/g, '""')}"`
          : value,
      );

      // Remove top level GeoJSON "type" property
      const typeIndex = csvColumns.indexOf("type");
      if (typeIndex > -1) {
        csvColumns.splice(typeIndex, 1);
        csvData.splice(typeIndex, 1);
      }

      // Append geometry type and coordinates at the end
      csvColumns.push("type");
      csvData.push(`"${geometry.type}"`);
      csvColumns.push("coordinates");
      csvData.push(`"${coordinates}"`);

      const csvString = [csvColumns.join(","), csvData.join(",")].join("\n");

      // Set filename
      let filename;
      if (this.geojson.properties["alertID"]) {
        filename = `${this.geojson.properties["alertID"]}.csv`;
      } else if (this.geojson.properties["ID"]) {
        filename = `${this.geojson.properties["ID"]}.csv`;
      } else {
        filename = "data.csv";
      }
      // Download CSV
      const blob = new Blob([csvString], { type: "text/csv" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      // Clean up and free memory
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    downloadAlertGeoJSON() {
      // Convert featureObject to GeoJSON and download
      if (!this.geojson) {
        console.error("No GeoJSON data available to download.");
        return;
      }

      delete this.geojson.properties["YYYYMM"];

      // Set filename
      let filename;
      if (this.geojson.properties["alertID"]) {
        filename = `${this.geojson.properties["alertID"]}.geojson`;
      } else if (this.geojson.properties["ID"]) {
        filename = `${this.geojson.properties["ID"]}.geojson`;
      } else {
        filename = "data.csv";
      }

      const jsonStr = JSON.stringify(this.geojson, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      // Clean up and free memory
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    downloadAlertKML() {
      if (!this.geojson) {
        console.error("No GeoJSON data available to download as KML.");
        return;
      }

      const kmlString = tokml(this.geojson);

      // Set filename
      let filename;
      if (this.geojson.properties["alertID"]) {
        filename = `${this.geojson.properties["alertID"]}.kml`;
      } else if (this.geojson.properties["ID"]) {
        filename = `${this.geojson.properties["ID"]}.kml`;
      } else {
        filename = "data.kml";
      }

      const blob = new Blob([kmlString], {
        type: "application/vnd.google-earth.kml+xml",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    downloadCSVSelection() {
      if (
        !this.geojson ||
        (this.geojson.mostRecentAlerts.features.length <= 0 &&
          this.geojson.previousAlerts.features.length <= 0)
      ) {
        console.warn("No complete GeoJSON data available to download as CSV.");
        return;
      }

      // Combine features from mostRecentAlerts and previousAlerts
      const combinedFeatures = [
        ...this.geojson.previousAlerts.features,
        ...this.geojson.mostRecentAlerts.features,
      ];

      // Prepare CSV data
      let csvString = "";
      let headerWritten = false;

      combinedFeatures.forEach((feature) => {
        const { geometry, properties } = feature;

        // Flatten the object
        let flattened = { ...properties };
        delete flattened["image_url"];
        delete flattened["image_caption"];
        delete flattened["preview_link"];
        delete flattened["YYYYMM"];

        // Handle coordinates and other properties that need special formatting
        const coordinates = JSON.stringify(geometry.coordinates);
        flattened["coordinates"] = coordinates;

        // Generate CSV columns and data
        const csvColumns = Object.keys(flattened);
        const csvData = Object.values(flattened).map((value) =>
          typeof value === "string" && value.includes(",")
            ? `"${value.replace(/"/g, '""')}"`
            : value,
        );

        // Append geometry type at the end
        csvColumns.push("geometry type");
        csvData.push(`"${geometry.type}"`);

        // Write header only once
        if (!headerWritten) {
          csvString += csvColumns.join(",") + "\n";
          headerWritten = true;
        }

        // Append the data row
        csvString += csvData.join(",") + "\n";
      });

      // Download CSV
      const filename = `${combinedFeatures[0].properties["territory"]}_alerts.csv`;
      const blob = new Blob([csvString], { type: "text/csv" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      // Clean up and free memory
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    downloadGeoJSONSelection() {
      if (
        !this.geojson ||
        (this.geojson.mostRecentAlerts.features.length <= 0 &&
          this.geojson.previousAlerts.features.length <= 0)
      ) {
        console.warn("No complete GeoJSON data available to download.");
        return;
      }

      // Combine features from mostRecentAlerts and previousAlerts
      const combinedFeatures = [
        ...this.geojson.previousAlerts.features,
        ...this.geojson.mostRecentAlerts.features,
      ];

      combinedFeatures.forEach((feature) => {
        delete feature.properties["image_url"];
        delete feature.properties["image_caption"];
        delete feature.properties["preview_link"];
        delete feature.properties["YYYYMM"];
      });

      // Create a new FeatureCollection GeoJSON object
      const combinedGeoJSON = {
        type: "FeatureCollection",
        features: combinedFeatures,
      };

      // Convert to string for download
      const filename = `${combinedGeoJSON.features[0].properties["territory"]}_alerts.geojson`;
      const jsonStr = JSON.stringify(combinedGeoJSON, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });

      // Create a link and trigger download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      // Clean up and free memory
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
    downloadKMLSelection() {
      if (
        !this.geojson ||
        (this.geojson.mostRecentAlerts.features.length <= 0 &&
          this.geojson.previousAlerts.features.length <= 0)
      ) {
        console.warn("No complete GeoJSON data available to download as KML.");
        return;
      }

      const combinedFeatures = [
        ...this.geojson.previousAlerts.features,
        ...this.geojson.mostRecentAlerts.features,
      ];

      const combinedGeoJSON = {
        type: "FeatureCollection",
        features: combinedFeatures,
      };

      const kmlString = tokml(combinedGeoJSON);

      const filename = `${combinedFeatures[0].properties["territory"]}_alerts.kml`;

      const blob = new Blob([kmlString], {
        type: "application/vnd.google-earth.kml+xml",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },
  },
};
</script>

<style scoped>
.button-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
