import 'ol/ol.css';
import { Map, View } from 'ol';
import { Tile, Image } from 'ol/layer';
import { OSM, ImageWMS, XYZ, StadiaMaps } from 'ol/source';
import { transformExtent } from 'ol/proj';
import { ScaleLine, FullScreen, MousePosition } from 'ol/control';
import { createStringXY } from 'ol/coordinate';

// ─── PLACEHOLDER CONFIG — replace with your GeoServer WMS URL and layer names ───
// File → layer name mapping (drop extension, use workspace prefix):
//   Turkey_[pollutant]_zonal_statistics.gpkg  → Turkey_[pollutant]_zonal_statistics
//   Turkey_average_[pollutant]_2023.tif        → Turkey_average_[pollutant]_2023
//   Turkey_CAMS_[pollutant]_2023_12.tif       → Turkey_CAMS_[pollutant]_2023_12
// Pollutant tokens: pm10 | no2 | pm2p5
const WMS_URL = 'https://www.gis-geoserver.polimi.it/geoserver/gisgeoserver_15/wms';

const LAYER_NAMES = {
    no2: {
        concentration:   'gisgeoserver_15:Turkey_no2_concentration_map_2023',
        amac:            'gisgeoserver_15:Turkey_no2_2021_2023_AMAC_map',
        landCover:       'gisgeoserver_15:TURKEY_LCC_2021_2023',
        bivariate:       'gisgeoserver_15:Turkey_no2_pol_2023_bivariate',
        population:      'gisgeoserver_15:YOUR_NO2_POPULATION_LAYER',
        zonalStatistics: 'gisgeoserver_15:Turkey_no2_zonal_statistics',
        average2023:     'gisgeoserver_15:Turkey_average_no2_2023',
        cams2023:        'gisgeoserver_15:Turkey_CAMS_no2_2023_12',
    },
    pm25: {
        concentration:   'gisgeoserver_15:Turkey_pm2p5_concentration_map_2023',
        amac:            'gisgeoserver_15:Turkey_pm2p5_2021_2023_AMAC_map',
        landCover:       'gisgeoserver_15:TURKEY_LCC_2021_2023',
        bivariate:       'gisgeoserver_15:Turkey_pm2p5_pol_2023_bivariate',
        population:      'gisgeoserver_15:YOUR_PM25_POPULATION_LAYER',
        zonalStatistics: 'gisgeoserver_15:Turkey_pm2p5_zonal_statistics',
        average2023:     'gisgeoserver_15:Turkey_average_pm2p5_2023',
        cams2023:        'gisgeoserver_15:Turkey_CAMS_pm2p5_2023_12',
    },
    pm10: {
        concentration:   'gisgeoserver_15:TURKEY_pm10_concentration_map_2023',
        amac:            'gisgeoserver_15:TURKEY_pm10_2021_2023_AMAC_map',
        landCover:       'gisgeoserver_15:TURKEY_LCC_2021_2023',
        bivariate:       'gisgeoserver_15:Turkey_pm10_2023_bivariate',
        population:      'gisgeoserver_15:Turkey_pm10_2023_chart',
        zonalStatistics: 'gisgeoserver_15:Turkey_pm10_zonal_statistics',
        average2023:     'gisgeoserver_15:Turkey_average_pm10_2023',
        cams2023:        'gisgeoserver_15:TURKEY_CAMS_pm10_2023_12',
    },
};

const TURKEY_EXTENT_4326 = [25.6, 35.8, 44.9, 42.1];
const TURKEY_EXTENT = transformExtent(TURKEY_EXTENT_4326, 'EPSG:4326', 'EPSG:3857');

const POLLUTANT_LABELS = { no2: 'NO₂', pm25: 'PM₂.₅', pm10: 'PM10' };

// ─── State ────────────────────────────────────────────────────────────────────
let activePollutant = 'pm10';

const overlayMeta = {
    concentration:   { label: 'Concentration map 2023', visible: true },
    amac:            { label: 'AMAC change 2021–2023', visible: false },
    landCover:       { label: 'Land Cover Change', visible: false },
    bivariate:       { label: 'Bivariate (population × pollution)', visible: false },
    population:      { label: 'Population quantiles', visible: false },
    zonalStatistics: { label: 'Zonal statistics', visible: false },
    average2023:     { label: 'Average 2023', visible: false },
    cams2023:        { label: 'CAMS Dec 2023', visible: false },
};

// ─── Basemaps ─────────────────────────────────────────────────────────────────
const basemaps = {
    osm: new Tile({
        source: new OSM(),
        visible: true,
    }),
    esriTopo: new Tile({
        source: new XYZ({
            attributions:
                'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer">ArcGIS</a>',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        }),
        visible: false,
    }),
    esriImagery: new Tile({
        source: new XYZ({
            attributions:
                'Tiles © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">ArcGIS</a>',
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        }),
        visible: false,
    }),
    stamenToner: new Tile({
        source: new StadiaMaps({ layer: 'stamen_toner' }),
        visible: false,
    }),
};

function createWmsLayer(layerKey) {
    return new Image({
        source: new ImageWMS({
            url: WMS_URL,
            params: {
                LAYERS: LAYER_NAMES[activePollutant][layerKey],
                TILED: true,
            },
            ratio: 1,
            serverType: 'geoserver',
        }),
        opacity: 0.85,
        visible: overlayMeta[layerKey].visible,
    });
}

const overlayLayers = {
    concentration:   createWmsLayer('concentration'),
    amac:            createWmsLayer('amac'),
    landCover:       createWmsLayer('landCover'),
    bivariate:       createWmsLayer('bivariate'),
    population:      createWmsLayer('population'),
    zonalStatistics: createWmsLayer('zonalStatistics'),
    average2023:     createWmsLayer('average2023'),
    cams2023:        createWmsLayer('cams2023'),
};

// ─── Map ──────────────────────────────────────────────────────────────────────
const map = new Map({
    target: 'map',
    layers: [
        basemaps.osm,
        basemaps.esriTopo,
        basemaps.esriImagery,
        basemaps.stamenToner,
        overlayLayers.concentration,
        overlayLayers.amac,
        overlayLayers.landCover,
        overlayLayers.bivariate,
        overlayLayers.population,
        overlayLayers.zonalStatistics,
        overlayLayers.average2023,
        overlayLayers.cams2023,
    ],
    view: new View({
        projection: 'EPSG:3857',
    }),
    controls: [
        new ScaleLine({ bar: true, text: true }),
        new FullScreen(),
        new MousePosition({
            coordinateFormat: createStringXY(4),
            projection: 'EPSG:4326',
            className: 'mouse-coords',
            placeholder: '—',
        }),
    ],
});

map.getView().fit(TURKEY_EXTENT, { padding: [40, 40, 40, 40] });

// ─── Pollutant switcher ───────────────────────────────────────────────────────
function setPollutant(pollutant) {
    activePollutant = pollutant;

    document.querySelectorAll('.pollutant-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.pollutant === pollutant);
    });

    for (const key of Object.keys(overlayLayers)) {
        overlayLayers[key].getSource().updateParams({
            LAYERS: LAYER_NAMES[pollutant][key],
        });
    }

    updateLegend();
}

document.querySelectorAll('.pollutant-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPollutant(btn.dataset.pollutant));
});

// ─── Layer panel toggles ──────────────────────────────────────────────────────
function setOverlayVisibility(layerKey, visible) {
    overlayMeta[layerKey].visible = visible;
    overlayLayers[layerKey].setVisible(visible);
    updateLegend();
}

document.querySelectorAll('.layer-toggle').forEach((input) => {
    input.addEventListener('change', () => {
        setOverlayVisibility(input.dataset.layer, input.checked);
    });
});

// ─── Sidebar collapse ─────────────────────────────────────────────────────────
const sidebar = document.getElementById('layer-panel');
const sidebarToggle = document.getElementById('sidebar-toggle');

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
});

// ─── Basemap switcher ─────────────────────────────────────────────────────────
function setBasemap(name) {
    for (const [key, layer] of Object.entries(basemaps)) {
        layer.setVisible(key === name);
    }
    document.querySelectorAll('.basemap-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.basemap === name);
    });
}

document.querySelectorAll('.basemap-btn').forEach((btn) => {
    btn.addEventListener('click', () => setBasemap(btn.dataset.basemap));
});

// ─── Opacity slider ───────────────────────────────────────────────────────────
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');

opacitySlider.addEventListener('input', () => {
    const value = parseFloat(opacitySlider.value);
    opacityValue.textContent = `${Math.round(value * 100)}%`;
    for (const layer of Object.values(overlayLayers)) {
        layer.setOpacity(value);
    }
});

// ─── Dynamic legend ───────────────────────────────────────────────────────────
async function updateLegend() {
    const legendContent = document.getElementById('legend-content');
    const pollutantLabel = POLLUTANT_LABELS[activePollutant];
    legendContent.innerHTML = `<p class="legend-subtitle">${pollutantLabel}</p>`;

    const visibleKeys = Object.keys(overlayMeta).filter((k) => overlayMeta[k].visible);

    if (visibleKeys.length === 0) {
        legendContent.innerHTML += '<p class="legend-empty">No active layers</p>';
        return;
    }

    for (const key of visibleKeys) {
        const source = overlayLayers[key].getSource();
        const legendUrl = source.getLegendUrl(0, { format: 'image/png' });
        const title = overlayMeta[key].label;

        legendContent.innerHTML += `
            <div class="legend-item">
                <span class="legend-item-title">${title}</span>
                <img src="${legendUrl}" alt="${title} legend" class="legend-img" />
            </div>`;
    }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
setPollutant('pm10');
setBasemap('osm');
