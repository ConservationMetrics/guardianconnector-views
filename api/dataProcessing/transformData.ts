import { AlertRecord, Metadata, AlertsPerMonth } from "./types";
import {
  capitalizeFirstLetter,
  getRandomColor,
  calculateCentroid,
} from "./helpers";

// Transform survey data keys and values
const transformSurveyData = (
  filteredData: Array<Record<string, any>>,
): Array<Record<string, any>> => {
  const transformSurveyDataKey = (key: string): string => {
    let transformedKey = key
      .replace(/^g__/, "Geo")
      .replace(/^p__/, "")
      .replace(/_/g, " ");
    transformedKey = transformedKey.replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word
    if (transformedKey.toLowerCase() === "today") {
      transformedKey = "Data Collected On";
    } else if (transformedKey.toLowerCase() === "categoryid") {
      transformedKey = "Category";
    }
    return transformedKey.trimStart();
  };

  const transformSurveyDataValue = (key: string, value: any): any => {
    if (value === null) return null;
    if (key === "g__coordinates") return value;

    let transformedValue = value;
    if (typeof transformedValue === "string") {
      transformedValue = transformedValue
        .replace(/_/g, " ")
        .replace(/;/g, ", ");
      if (key.includes("Category")) {
        transformedValue = transformedValue.replace(/-/g, " ");
      }
      transformedValue =
        transformedValue.charAt(0).toUpperCase() + transformedValue.slice(1);
    }
    // Handle lists enclosed in square brackets
    if (
      typeof transformedValue === "string" &&
      transformedValue.match(/^\[.*\]$/)
    ) {
      transformedValue = transformedValue
        .replace(/^\[|\]$/g, "")
        .split(", ")
        .map((item) => item.replace(/'/g, ""))
        .join(", ");
    }
    return transformedValue;
  };
  const transformedData = filteredData.map((entry) => {
    const transformedEntry: Record<string, any> = {};
    Object.entries(entry).forEach(([key, value]) => {
      const transformedKey = transformSurveyDataKey(key);
      const transformedValue = transformSurveyDataValue(key, value);
      transformedEntry[transformedKey] = transformedValue;
    });
    return transformedEntry;
  });

  return transformedData;
};

// Prepare data for the map view
const prepareMapData = (
  transformedData: Array<Record<string, any>>,
  filterField: string | undefined,
): Array<Record<string, any>> => {
  const colorMap = new Map<string, string>();

  // Process different geometry types and extract coordinates
  const processGeolocation = (obj: any): any => {
    try {
      const geometryType = obj.Geotype;
      let coordinates;

      // Convert string to array
      if (!Array.isArray(obj.Geocoordinates)) {
        coordinates = JSON.parse(obj.Geocoordinates);
      } else {
        coordinates = obj.Geocoordinates;
      }
      if (
        geometryType === "Point" &&
        Array.isArray(coordinates) &&
        coordinates.length === 2
      ) {
        obj.Geocoordinates = coordinates;
      } else if (geometryType === "LineString") {
        obj.Geocoordinates = coordinates;
      } else if (geometryType === "Polygon") {
        obj.Geocoordinates = [coordinates];
      }
    } catch (error) {
      console.error("Error parsing coordinates:", error);
    }
    return obj;
  };

  // Add geometry type and process coordinates for each item
  const processedGeoData = transformedData.map((item) => {
    if (!item.Geotype) {
      let coordinateKey = Object.keys(item).find((key) =>
        key.toLowerCase().includes("coordinates"),
      );
      if (coordinateKey) {
        let coordinates = JSON.parse(item[coordinateKey]);
        if (
          Array.isArray(coordinates) &&
          coordinates.length === 2 &&
          typeof coordinates[0] === "number" &&
          typeof coordinates[1] === "number"
        ) {
          item.Geotype = "Point";
        } else {
          item.Geotype = "Polygon";
        }
      }
    }

    // Add random color to each item per the filter field
    if (filterField !== undefined) {
      const filterFieldValue = item[filterField];
      if (filterFieldValue) {
        if (!colorMap.has(filterFieldValue)) {
          colorMap.set(filterFieldValue, getRandomColor());
        }
        item["filter-color"] = colorMap.get(filterFieldValue);
      } else {
        item["filter-color"] = "#FFA500"; // Fallback color of orange
      }
    } else {
      // Handle the case when filterField is undefined
      // For example, you might want to set a default color
      item["filter-color"] = "#FFA500"; // Fallback color of orange
    }

    return processGeolocation(item);
  });

  return processedGeoData;
};

// Prepare data for the alerts view
const prepareAlertData = (
  data: Array<Record<string, any>>,
  embedMedia: boolean,
): {
  mostRecentAlerts: Array<Record<string, any>>;
  previousAlerts: Array<Record<string, any>>;
} => {
  const transformChangeDetectionItem = (
    item: Record<string, any>,
    formattedMonth: string,
    embedMedia: boolean,
  ): Record<string, any> => {
    const transformedItem: Record<string, any> = {};

    // Keep fields starting with 'g__'
    Object.keys(item).forEach((key) => {
      if (key.startsWith("g__")) {
        transformedItem[key] = item[key];
      }
    });

    // To rewrite the satellite prefix field
    const satelliteLookup: { [key: string]: string } = {
      S1: "Sentinel-1",
      S2: "Sentinel-2",
      PS: "Planetscope",
      L8: "Landsat 8",
      L9: "Landsat 9",
      WV1: "WorldView-1",
      WV2: "WorldView-2",
      WV3: "WorldView-3",
      WV4: "WorldView-4",
      IK: "IKONOS",
    };

    // Include only the transformed fields
    transformedItem["Territory"] = capitalizeFirstLetter(
      item.territory_name ?? "",
    );
    transformedItem["Alert ID"] = item._id;
    transformedItem["Alert detection range"] =
      `${item.date_start_t1} to ${item.date_end_t1}`;
    transformedItem["Month detected"] = `${formattedMonth}-${item.year_detec}`;
    transformedItem["YYYYMM"] = `${item.year_detec}${formattedMonth}`;
    transformedItem["Data provider"] = capitalizeFirstLetter(`${item._topic}`);
    transformedItem["Alert type"] = item.alert_type?.replace(/_/g, " ") ?? "";
    transformedItem["Alert area (hectares)"] =
      typeof item.area_alert_ha === "number"
        ? item.area_alert_ha.toFixed(2)
        : item.area_alert_ha;
    transformedItem["Geographic centroid"] = calculateCentroid(
      item.g__coordinates,
    );
    transformedItem["Satellite used for detection"] =
      satelliteLookup[item.sat_detect_prefix] || item.sat_detect_prefix;

    if (embedMedia) {
      transformedItem["t0_url"] =
        `alerts/${item.territory_id}/${item.year_detec}/${formattedMonth}/${item._id}/resources/output_t0.jpg`;
      transformedItem["t1_url"] =
        `alerts/${item.territory_id}/${item.year_detec}/${formattedMonth}/${item._id}/resources/output_t1.jpg`;
      transformedItem["Preview imagery source"] =
        satelliteLookup[item.sat_viz_prefix] || item.sat_viz_prefix;
    }

    return transformedItem;
  };

  let latestDate = new Date(0);
  let latestMonthStr = "";

  // First pass to find the latest date
  data.forEach((item) => {
    const formattedMonth =
      item.month_detec.length === 1 ? `0${item.month_detec}` : item.month_detec;
    const monthYearStr = `${formattedMonth}-${item.year_detec}`;
    const date = new Date(item.year_detec, formattedMonth - 1);

    if (date > latestDate) {
      latestDate = date;
      latestMonthStr = monthYearStr;
    }
  });

  const mostRecentAlerts: Array<Record<string, any>> = [];
  const previousAlerts: Array<Record<string, any>> = [];

  // Second pass to segregate the data
  data.forEach((item) => {
    // Prepend 0 to single-digit months, if found
    const formattedMonth =
      item.month_detec.length === 1 ? `0${item.month_detec}` : item.month_detec;

    const monthYearStr = `${formattedMonth}-${item.year_detec}`;

    const transformedItem = transformChangeDetectionItem(
      item,
      formattedMonth,
      embedMedia,
    );

    // Segregate data based on the latest month detected
    if (monthYearStr === latestMonthStr) {
      mostRecentAlerts.push(transformedItem);
    } else {
      previousAlerts.push(transformedItem);
    }
  });

  return { mostRecentAlerts, previousAlerts };
};

// Prepare statistics for the alerts view intro panel
const prepareAlertStatistics = (
  data: AlertRecord[],
  metadata: Metadata[] | null,
): Record<string, any> => {
  const territory =
    data[0].territory_name.charAt(0).toUpperCase() +
    data[0].territory_name.slice(1);

  const typeOfAlerts = Array.from(
    new Set(data.map((item) => item.alert_type.replace(/_/g, " "))),
  );

  const dataProviders = Array.from(
    new Set(data.map((item) => item._topic.replace(/_/g, " "))),
  ).map((provider) => provider.replace(/\b\w/g, (char) => char.toUpperCase()));

  // Create Date objects for sorting and comparisons
  const formattedDates = data.map((item) => ({
    date: new Date(
      `${item.year_detec}-${item.month_detec.padStart(2, "0")}-15`,
    ),
    dateString: `${item.month_detec.padStart(2, "0")}-${item.year_detec}`,
  }));

  // Sort dates to find the earliest and latest
  formattedDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  let earliestDateStr, latestDateStr;
  let earliestDate: Date, latestDate: Date;

  if (metadata && metadata.length > 0) {
    // Find earliest and latest dates from metadata
    metadata.sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year,
    );
    const earliestMetadata = metadata[0];
    const latestMetadata = metadata[metadata.length - 1];

    earliestDate = new Date(
      earliestMetadata.year,
      earliestMetadata.month - 1,
      1,
    );
    latestDate = new Date(latestMetadata.year, latestMetadata.month - 1, 28);

    earliestDateStr = `${String(earliestMetadata.month).padStart(2, "0")}-${earliestMetadata.year}`;
    latestDateStr = `${String(latestMetadata.month).padStart(2, "0")}-${latestMetadata.year}`;
  } else {
    // If metadata is null, calculate earliest and latest dates from data
    const formattedDates = data.map((item) => ({
      date: new Date(
        `${item.year_detec}-${item.month_detec.padStart(2, "0")}-15`,
      ),
      dateString: `${item.month_detec.padStart(2, "0")}-${item.year_detec}`,
    }));

    formattedDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    earliestDate = formattedDates[0].date;
    earliestDate.setDate(1);
    earliestDateStr = formattedDates[0].dateString;

    latestDate = formattedDates[formattedDates.length - 1].date;
    latestDate.setDate(28);
    latestDateStr = formattedDates[formattedDates.length - 1].dateString;
  }

  // Create an array of all dates
  const allDates = Array.from(
    new Set(formattedDates.map((item) => item.dateString)),
  );

  // Determine the date 12 months before the latest date
  const twelveMonthsBefore = new Date(latestDate);
  twelveMonthsBefore.setFullYear(twelveMonthsBefore.getFullYear() - 1);

  // Filter and sort the data for the last 12 months
  const last12MonthsData = data
    .filter((item) => {
      const itemDate = new Date(
        `${item.year_detec}-${item.month_detec.padStart(2, "0")}-01`,
      );
      return itemDate >= twelveMonthsBefore && itemDate <= latestDate;
    })
    .sort((a, b) => {
      const aDate = new Date(
        `${a.year_detec}-${a.month_detec.padStart(2, "0")}`,
      );
      const bDate = new Date(
        `${b.year_detec}-${b.month_detec.padStart(2, "0")}`,
      );
      return aDate.getTime() - bDate.getTime();
    });

  const twelveMonthsBeforeStr = `${
    twelveMonthsBefore.getMonth() + 1
  }-${twelveMonthsBefore.getFullYear()}`;

  const getUpTo12MonthsForChart = (): string[] => {
    const months = [];

    // We have to use UTC here to avoid issues with local time settings
    const currentDate = new Date(
      Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 15),
    );

    for (let i = 0; i < 12; i++) {
      // Decrement the month in currentDate, after the first iteration (latestDate).
      // This moves the date back by one month at a time.
      if (i > 0) {
        currentDate.setMonth(currentDate.getMonth() - 1);
      }

      // Format the month part of the currentDate to ensure it has two digits.
      // This is necessary as months are 0-indexed in JavaScript,
      // so January is 0, February is 1, and so on.
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
      const year = currentDate.getUTCFullYear();
      const monthYear = `${month}-${year}`;

      // Check if this currentDate falls within the range of earliestDate and latestDate.
      // If it does, add the monthYear string to the months array.
      if (currentDate >= earliestDate && currentDate <= latestDate) {
        months.push(monthYear);
      }
    }

    // Reverse the months array to have the dates in ascending order.
    months.reverse();
    return months;
  };

  // Helper function to update months cumulatively
  // Whether it be alerts or hectares
  const updateCumulativeData = (
    dataCollection: AlertRecord[],
    accumulatorMap: Record<string, number>,
    property: "alerts" | "hectares",
  ) => {
    let cumulativeValue = 0;
    const months = Object.keys(accumulatorMap);

    months.forEach((monthYear) => {
      if (property === "alerts") {
        const monthData = dataCollection.filter(
          (item) =>
            `${item.month_detec.padStart(2, "0")}-${item.year_detec}` ===
            monthYear,
        );
        cumulativeValue += monthData.length;
      } else if (property === "hectares") {
        dataCollection.forEach((item) => {
          const monthYearItem = `${item.month_detec.padStart(2, "0")}-${item.year_detec}`;
          if (monthYearItem === monthYear) {
            const hectares = parseFloat(item.area_alert_ha);
            cumulativeValue += isNaN(hectares) ? 0 : hectares;
          }
        });
      }
      accumulatorMap[monthYear] = parseFloat(cumulativeValue.toFixed(2));
    });
  };

  // Initialize alertsPerMonth and hectaresPerMonth
  const alertsPerMonth: AlertsPerMonth = {};
  const hectaresPerMonth: AlertsPerMonth = {};
  const months = getUpTo12MonthsForChart();

  months.forEach((monthYear) => {
    alertsPerMonth[monthYear] = 0;
    hectaresPerMonth[monthYear] = 0;
  });

  // Populate alertsPerMonth and hectaresPerMonth using the helper function
  updateCumulativeData(last12MonthsData, alertsPerMonth, "alerts");
  updateCumulativeData(last12MonthsData, hectaresPerMonth, "hectares");

  // Count the number of alerts for the most recent date
  const recentAlertDate =
    last12MonthsData.length > 0
    ? `${last12MonthsData[last12MonthsData.length - 1].month_detec.padStart(2, "0")}-${last12MonthsData[last12MonthsData.length - 1].year_detec}`
    : 'N/A';
  const recentAlertsNumber = data.filter(
    (item) =>
      `${item.month_detec.padStart(2, "0")}-${item.year_detec}` ===
      recentAlertDate,
  ).length;

  // Calculate total number of alerts
  const alertsTotal = data.length;

  // Calculate total hectares
  const hectaresTotal = data
    .reduce((total, item) => total + parseFloat(item.area_alert_ha || "0"), 0)
    .toFixed(2);

  return {
    territory,
    typeOfAlerts,
    dataProviders,
    alertDetectionRange: `${earliestDateStr} to ${latestDateStr}`,
    allDates,
    earliestAlertsDate: earliestDateStr,
    recentAlertsDate: recentAlertDate,
    recentAlertsNumber,
    alertsTotal,
    alertsPerMonth,
    hectaresTotal,
    hectaresPerMonth,
    twelveMonthsBefore: twelveMonthsBeforeStr,
  };
};

// Transform data to GeoJSON format
const transformToGeojson = (
  inputArray: Array<{ [key: string]: any }>,
): {
  type: string;
  features: Array<{
    type: string;
    id?: string | undefined;
    properties: { [key: string]: any };
    geometry?: { [key: string]: any };
  }>;
} => {
  const features = inputArray.map((input) => {
    const feature = {
      type: "Feature",
      id: undefined,
      properties: {} as { [key: string]: any },
      geometry: {} as { [key: string]: any },
    };

    Object.entries(input).forEach(([key, value]) => {
      if (key === "Alert ID") {
        feature.id = value.substring(4);
        feature.properties[key] = value;
      } else if (key.startsWith("g__")) {
        const geometryKey = key.substring(3); // Removes 'g__' prefix
        if (geometryKey === "coordinates") {
          feature.geometry[geometryKey] = JSON.parse(value);
        } else {
          feature.geometry[geometryKey] = value;
        }
      } else {
        feature.properties[key] = value;
      }
    });

    return feature;
  });

  return {
    type: "FeatureCollection",
    features: features,
  };
};

export {
  transformSurveyData,
  prepareMapData,
  prepareAlertData,
  prepareAlertStatistics,
  transformToGeojson,
};
