import React, { useState, useEffect } from "react";
import { styled } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';


import mapboxgl from 'mapbox-gl';
import { Layer } from '@deck.gl/core/typed'
import { DeckGL } from '@deck.gl/react/typed'
import {GeoJsonLayer, PolygonLayer, IconLayer} from '@deck.gl/layers/typed'
import {ScenegraphLayer} from '@deck.gl/mesh-layers/typed';
import {TerrainLayer} from '@deck.gl/geo-layers/typed';
import { Map } from 'react-map-gl' 
import Button from '@mui/material/Button';

// Interfaces
import UserInputs from "../models/user-inputs";
import Metrics from "../models/metrics";
import MapViewState from "../models/map-view-state";
import FileContents from "../models/file";

import MetricDisplay from "../components/metric-display";

// utils
import { computeGeoMatrics } from "../utils/geo-operations";

import heritageTrail from "../data/heritageTrail";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { List } from "@mui/material";
import { FeatureCollection } from "@turf/turf";


// prevent mapboxgl from being transpiled by Babel
//@ts-ignore 
// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN as string;

const api_url = "https://tile.buildingshistory.co.uk";

const drawerWidth: number = 300;

function onHover(info: any) {
  const { x, y, object } = info;
  const tooltipElement = document.getElementById('custom-tooltip');
  // const cardElement = document.getElementById('custom-card');

  // this.map.getCanvas().style.cursor = 'pointer';

    
  // const coordinates = info.coordinate;
  // if (coordinates) {
  //   const lngLat = {
  //     lng: coordinates[0],
  //     lat: coordinates[1]
  //   };
  //   const elevation = Math.floor( 
  //     // Do not use terrain exaggeration to get actual meter values
  //     this.map.queryTerrainElevation(lngLat, { exaggerated: false })
  //   );
  // }

  if (object) {
    // <img src="/galleries/${object.URL}" alt="Click to view full image">
    // console.log(object);
      const tooltipContent = `
      <br>
      <b>Altitude:</b> ${object.altitude.toFixed(2)}m
      <br>
      <b>Heading:</b> ${object.bearing.toFixed(2)}°
      `;
    const coordinates = info.coordinate;
      while (Math.abs(info.viewport.longitude - coordinates[0]) > 180) {
          coordinates[0] += info.viewport.longitude > coordinates[0] ? 360 : -360;
      };
      
      tooltipElement!.innerHTML = tooltipContent;
      // cardElement!.style.display = 'none'
      tooltipElement!.style.display = 'block';
      tooltipElement!.style.left = x + 'px';
      tooltipElement!.style.top = y + 'px';
      tooltipElement!.style.color = "black";
      tooltipElement!.style.zIndex = "999";
      
  } else {
      // this.map.getCanvas().style.cursor = '';
      tooltipElement!.style.display = 'none';
  }
}

function onClick(info: any) {
  const { x, y, object } = info;
  // const mapCanvas = this.map.getCanvas();
  const cardElement = document.getElementById('custom-card');
  const tooltipElement = document.getElementById('custom-tooltip');

  // mapCanvas.style.cursor = 'pointer';



  const coordinates = info.coordinate;

  while (Math.abs(info.viewport.longitude - coordinates[0]) > 180) {
    coordinates[0] += info.viewport.longitude > coordinates[0] ? 360 : -360;
  }

  // cardElement.innerHTML = object.popup_html;
  // cardElement.style.color = '#000';
  // cardElement.style.fontSize = '12px';
  // cardElement.style.zIndex = 999;
  
  // cardElement.style.display = 'block';
  tooltipElement!.style.display = 'none'
  // cardElement.style.left = x + 'px';
  // cardElement.style.top = y + 'px';
}

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      boxSizing: 'border-box',
      ...(!open && {
        overflowX: 'hidden',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        width: theme.spacing(7),
        [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9),
        },
      }),
    },
  }),
);

interface MapResultProps {
  geo: any;
}

export default function MapResultBP({ geo }: MapResultProps) {
  const [open, setOpen] = React.useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };
  

  const [inputs, setInputs] = useState<UserInputs>({ lotCoverage: 50, floorNumber: 10, floorHeight: 10 })
  const [centerCoords, setCenterCoords] = useState<[number,number]>([0,0])
  const geojsonFileContents = React.useRef<FileContents>({ type: '', coordinates: [[]]})
  const [layers, setLayers]  = useState<Layer[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [viewState, setViewState] = useState<MapViewState>({  latitude: 46.203589,
                                                              longitude: 6.136900,
                                                              zoom: 4, 
                                                              pitch: 45 });
  const [metrics,setMetrics] = useState<Metrics>({  landArea: 0, 
                                                    buildingArea: 0,
                                                    volume: 0, 
                                                    buildingHeight: (inputs.floorHeight*inputs.floorNumber) })

  const { lotCoverage, floorNumber, floorHeight } = inputs
  const { landArea, buildingArea, volume, buildingHeight } = metrics
  let fileReader: FileReader

  const createDefaultBuilding = (land: string, building: FeatureCollection, buildingHeight: number, cameraGPSData: any): void => {
    
        const ground = new GeoJsonLayer({  id: 'geojson-ground-layer',
                                                data: land,
                                                getLineColor: [0,0,0,255],
                                                getFillColor: [183, 244, 216,255],
                                                getLineWidth: () => 0.3,
                                                opacity: 1 })
  
        const buildingDataCopy = [...(building.features[0].geometry as any).coordinates]; 
        let buildingCoords = buildingDataCopy[0].map((item: any) => {
          item.push(building.features[0].properties!.absoluteheightminimum);
          return item;
        });
        // buildingCoords = [buildingCoords];
        const polygonData = [{
          contour: buildingCoords
        }];

        console.log(polygonData);
        const storey = new PolygonLayer({   id: 'geojson-storey-building',
                                            data: polygonData,
                                            extruded: true,
                                            wireframe: true,
                                            getPolygon: (d) =>{
                                              return d.contour;
                                            },
                                            getFillColor: [249,180,45,255],
                                            getLineColor: [0,0,0,255],
                                            getElevation: buildingHeight,
                                            opacity: 1 })
        // const deckglMarkerLayer = new IconLayer({   id: 'exif-icon-kayer',
        //                                     data: cameraGPSData,
        //                                     getIcon: (d) => 'marker',
        //                                     iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
        //                                     iconMapping: {
        //                                         marker: {x: 0, y: 0, width: 128, height: 128, mask: true}
        //                                     },
        //                                     getPosition: d => d.coordinates,
        //                                     getColor: d => [Math.sqrt(d.exits), 140, 0],
        //                                     getSize: d => 5,
        //                                     // updateTriggers: {
        //                                     //   // This tells deck.gl to recalculate radius when `currentYear` changes
        //                                     //   getPosition: [imgInfoArray]
        //                                     // },
        //                                     // getAngle: (d) => - d.bearing, // negative of bearing as deck.gl uses counter clockwise rotations.
        //                                     sizeScale: 8,
        //                                     billboard: true,
        //                                     pickable: true,
        //                                     onHover: onHover,
        //                                     onClick: onClick,
        //                                   })
        // setLayers([ground, storey, exif3dCameraLayer])
        const url = './cam.gltf';
        console.log(cameraGPSData)
        const exif3dCameraLayer = new ScenegraphLayer({   id: 'exif3d-camera-layer',
                                            data: cameraGPSData,
                                            scenegraph: url,
                                            getPosition: d => d.coordinates,
                                            getColor: d => [203, 24, 226],
                                            getOrientation: d => [0, - d.bearing, 90],
                                            opacity: 1 
                                          })

        const deckglMarkerLayer = new IconLayer({   id: 'exif-icon-kayer',
                                            data: cameraGPSData,
                                            getIcon: (d) => 'marker',
                                            iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
                                            iconMapping: {
                                                marker: {x: 0, y: 0, width: 128, height: 128, mask: true}
                                            },
                                            getPosition: d => d.coordinates,
                                            getColor: d => [Math.sqrt(d.exits), 140, 0],
                                            getSize: d => 5,
                                            // updateTriggers: {
                                            //   // This tells deck.gl to recalculate radius when `currentYear` changes
                                            //   getPosition: [imgInfoArray]
                                            // },
                                            // getAngle: (d) => - d.bearing, // negative of bearing as deck.gl uses counter clockwise rotations.
                                            sizeScale: 8,
                                            billboard: true,
                                            pickable: true,
                                            onHover: onHover,
                                            onClick: onClick,
                                          })
  
  const deckglTerrainLayer = new TerrainLayer({
    elevationDecoder: {
      "rScaler": 6553.6,
      "gScaler": 25.6,
      "bScaler": 0.1,
      "offset": -10000
    },
                                            // Digital elevation model from https://www.usgs.gov/
                                            elevationData: api_url+'/data/su_/{z}/{x}/{y}.png',
                                          });
        setLayers([ground, storey, exif3dCameraLayer, deckglMarkerLayer, deckglTerrainLayer])    
    }
  

    useEffect(() => {   
      handleFileRead(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[geo])
  
    const handleFileRead = (isFileUpload: boolean) => {

      let result = JSON.stringify(heritageTrail) as any;
      if (fileReader?.result) result = fileReader?.result;

      let geojson = JSON.parse(result);
      if (!isFileUpload) geojson = geo.geojson;

      console.log(geojson);

      const { center, landArea, buildingArea, buildingHeight, volume } = computeGeoMatrics(geojson.features[0].geometry.coordinates,floorHeight,floorNumber,lotCoverage)
      const { geometry: { coordinates: [longitude,latitude]}} = center

      createDefaultBuilding(geojson, geojson, parseFloat(geojson.features[0].properties.relativeheightmaximum), geo.cameraGPSData);
      setViewState(prev => ({...prev, longitude, latitude, zoom: 18}))
      geojsonFileContents.current = geojson
      setCenterCoords([longitude,latitude])
      setMetrics({ landArea, buildingArea, buildingHeight: parseFloat(geojson.features[0].properties.relativeheightmaximum), volume })
      if (!(lotCoverage === 50 && floorHeight === 10 && floorNumber === 10)) {
        setInputs({ lotCoverage: 50, floorNumber: 10, floorHeight: 10 })
      }
    }
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const { name } = e.target.files[0]
        let allowedExtension = /.geojson/;
        if(!allowedExtension.exec(name)){
          alert('Invalid File type uploaded. Only .geojson files supported')
          return;
        }
        fileReader = new FileReader()
        fileReader.onloadend = () => handleFileRead(true)
        fileReader.readAsText(e.target.files[0]);
        setFileName(e.target.files[0].name)
      }
    };

  const genHrefAttribute = <T,>(city: T) => {
    let data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(city));
    return 'data:' + data;
  }

  return (
    <>
      <>
        <Drawer variant="permanent" open={open}>
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              px: [1],
            }}
          >
            {open && 'Building attributes'}
            <IconButton onClick={toggleDrawer}>
              {open ? <ChevronLeft />: <ChevronRight />}
            </IconButton>
          </Toolbar>
          <Divider />
          <List dense={true} >
            {open && (
            <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
                <div className="button">
                  { !geojsonFileContents.current.type ? <Typography gutterBottom>No file loaded</Typography> : null }
                  <Button variant="contained" component="label">
                    LOAD GEOJSON
                    <input hidden accept='.geojson' onChange={handleFileChange} type="file" />
                  </Button>
                  <Typography >{fileName}</Typography>
                </div>
                <section style={{marginTop:'16px'}}>
                  <Typography variant="h6" gutterBottom>Download sample data</Typography>
                  <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        typography: 'body1',
                        '& > :not(style) ~ :not(style)': {
                        ml: 2,
                        },
                    }}
                    >
                    <Link href={genHrefAttribute(heritageTrail)} download='heritageTrail.geojson'>Heritage Trail</Link>
                  </Box>
                </section>

                <Divider variant="middle" />

                <Box sx={{ mt: 4, mb: 4 }}>
                    <Typography id="input-slider" variant="h6" gutterBottom>Statistiques</Typography>
                    <MetricDisplay value={landArea} unit='m2' label='Land Area' />
                    <MetricDisplay value={buildingArea} unit='m2' label='Building Area' />
                    <MetricDisplay value={buildingArea} unit='m2' label='Building Floor Area' />
                    <MetricDisplay value={volume} unit='m3' label='Volume' />
                    <MetricDisplay value={buildingHeight} unit='m' label='Building Height' />
                </Box>
            </div>
            )}
          </List>
        </Drawer>
        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <Toolbar />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <div className="custom-tooltip" id="custom-tooltip" style={
            {
              position: "absolute",
              height: "max-content",
              width: "max-content",
              // pointer-events: none,
              background: "white",
              color: "white",
              padding: "5px",
              borderRadius: "5px",
              // display: "none",
          }
          } ></div>

            <DeckGL
              initialViewState={viewState}
              layers={layers}
              controller={true}
            >

              <Map mapboxAccessToken={mapboxgl.accessToken} mapStyle="mapbox://styles/mapbox/streets-v9" />
            </DeckGL>
          </Container>
        </Box>
      </>
    </>
  );
}