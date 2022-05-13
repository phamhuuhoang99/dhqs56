import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { Draw, Modify, Snap, Select } from "ol/interaction";
import { OSM, Vector as VectorSource } from "ol/source";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { get } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
const axios = require("axios").default;
import { bbox as bboxStrategy } from "ol/loadingstrategy";
import Overlay from "ol/Overlay";

const geoJSONformat = new GeoJSON();
$(".stopEdit").hide();
const container = document.getElementById("popup");
const content = document.getElementById("popup-content");
const closer = document.getElementById("popup-closer");

const raster = new TileLayer({
  source: new OSM(),
});

const layer = new VectorLayer({
  source: new VectorSource({
    format: new GeoJSON(),
    url: function (extent) {
      return (
        "http://localhost:8090/geoserver/hoang/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=hoang:data&outputFormat=application/json&srsname=EPSG:3857&" +
        "bbox=" +
        extent.join(",") +
        ",EPSG:3857"
      );
    },
    strategy: bboxStrategy,
  }),
  style: new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({
        color: "#afee33",
      }),
    }),
    stroke: new Stroke({
      color: "#ffcc33",
      width: 2,
    }),
  }),
});

const source = new VectorSource();
const vector = new VectorLayer({
  source: source,
  style: new Style({
    fill: new Fill({
      color: "rgba(255, 255, 255, 0.2)",
    }),
    stroke: new Stroke({
      color: "#ffcc33",
      width: 2,
    }),
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({
        color: "#ffcc33",
      }),
    }),
  }),
});

// Limit multi-world panning to one world east and west of the real world.
// Geometry coordinates have to be within that range.
const extent = get("EPSG:3857").getExtent().slice();
extent[0] += extent[0];
extent[2] += extent[2];
const map = new Map({
  layers: [raster, vector, layer],
  target: "map",
  view: new View({
    center: [-11000000, 4600000],
    zoom: 4,
    extent,
  }),
});

// const select = new Select({
//   wrapX: false,
// });
// map.addInteraction(select);

let draw, snap, modify; // global so we can remove them later
const typeSelect = document.getElementById("type");

function addInteractions() {
  draw = new Draw({
    source: source,
    type: typeSelect.value,
  });
  map.addInteraction(draw);

  modify = new Modify({ source: source });
  map.addInteraction(modify);

  snap = new Snap({ source: source });
  map.addInteraction(snap);
}

/**
 * Handle change event.
 */
typeSelect.onchange = function () {
  if (draw && snap && modify) {
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    map.removeInteraction(modify);
    addInteractions();
  }
};

//event Click Add Button
$(".add").click(() => {
  addInteractions();
  $(".add").attr("disabled", true);
});

//Event Click Stop Button
$(".stop").click(() => {
  if (draw && snap) {
    $("#modalAdd").show();
  }
});

let IdFeaturesModified = [];

//Event click button Start Edit
$(".edit").click(() => {
  if (modify) map.removeInteraction(modify);
  modify = new Modify({ source: layer.getSource() });
  map.addInteraction(modify);

  $(".edit").hide();
  $(".stopEdit").show();

  modify.on("modifyend", function (e) {
    const feature = e.features.getArray()[0];
    let id = feature.getId();
    IdFeaturesModified.push(id);
  });
});

//Event click button Stop Edit
$(".stopEdit").click(() => {
  if (modify) map.removeInteraction(modify);

  const featuresEdit = layer
    .getSource()
    .getFeatures()
    .filter((feature) => IdFeaturesModified.indexOf(feature.getId()) != -1);

  let featureGeojson = geoJSONformat.writeFeaturesObject(featuresEdit);
  const geojsonFeatureArray = featureGeojson.features;

  let status = true;
  geojsonFeatureArray.forEach(async (feature) => {
    let id = feature.id.split(".")[1];

    const res = await axios.put("http://localhost:3000/api/edit/" + id, {
      geom: feature.geometry,
    });

    status && res.status === 200;
  });

  status ? alert("Update Thanh cong") : alert("Error");

  layer.getSource().refresh();

  $(".edit").show();
  $(".stopEdit").hide();
});

$(".closeFormAdd").click(() => {
  $("#modalAdd").hide();
  $(".add").attr("disabled", false);
  if (draw && snap) {
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    source.clear();
  }
});

//
$(".saveAdd").click(() => {
  let featureGeojson = geoJSONformat.writeFeaturesObject(source.getFeatures());
  const geojsonFeatureArray = featureGeojson.features;

  var name = $("#name").val();
  $("#name").val("");

  let status = true;
  geojsonFeatureArray.forEach(async (feature) => {
    const res = await axios.post("http://localhost:3000/api/add", {
      name: name,
      geom: feature.geometry,
    });

    status && res.status === 200;
  });
  $("#modalAdd").hide();

  status ? alert("Them thanh cong") : alert("Error");

  $(".add").attr("disabled", false);

  if (draw && snap && modify) {
    map.removeInteraction(draw);
    map.removeInteraction(snap);
    map.removeInteraction(modify);
  }
  source.clear();
  layer.getSource().refresh();
});

//Event delete Feature
$(".deleteFeature").click(async (e) => {
  const id = $(".deleteFeature").attr("data-id").split(".")[1];
  const res = await axios.delete("http://localhost:3000/api/delete/" + id);

  if (res.status === 200) {
    layer.getSource().refresh();
    overlay.setPosition(undefined);
    closer.blur();
  }
});

/**
 * Create an overlay to anchor the popup to the map.
 */
const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

map.addOverlay(overlay);

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

//Event click map
map.on("click", (e) => {
  const coordinate = e.coordinate;
  const feature = map.forEachFeatureAtPixel(e.pixel, function (feature) {
    return feature;
  });

  if (feature?.get("name") !== undefined) {
    content.innerHTML =
      "<p>You clicked here:</p><code>" + feature.get("name") + "</code><br/>";

    $(".deleteFeature").attr("data-id", `${feature.getId()}`);
    overlay.setPosition(coordinate);
  }
});
