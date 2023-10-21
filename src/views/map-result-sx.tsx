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
import { DeckGL } from '@deck.gl/react/typed'
import {GeoJsonLayer} from '@deck.gl/layers/typed'
import { Map } from 'react-map-gl' 
import Button from '@mui/material/Button';

// Interfaces
import UserInputs from "../models/user-inputs";
import Metrics from "../models/metrics";
import MapViewState from "../models/map-view-state";
import FileContents from "../models/file";

// Components
import Slider from "../components/slider";
import MetricDisplay from "../components/metric-display";

// utils
import { computeGeoMatrics, geoTransform } from "../utils/geo-operations";

import geneve from "../data/geneve";
import lausanne from "../data/lausanne";
import corseaux from "../data/corseaux";
import glasgow from "../data/glasgow";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { List } from "@mui/material";


// prevent mapboxgl from being transpiled by Babel
//@ts-ignore 
// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN as string;

const drawerWidth: number = 300;

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
  layerSx: any;
}

export default function MapResult({ layerSx }: MapResultProps) {
  const [open, setOpen] = React.useState(true);
  const toggleDrawer = () => {
    setOpen(!open);
  };
  

  const [inputs, setInputs] = useState<UserInputs>({ lotCoverage: 50, floorNumber: 10, floorHeight: 10 })
  const [centerCoords, setCenterCoords] = useState<[number,number]>([0,0])
  const geojsonFileContents = React.useRef<FileContents>({ type: '', coordinates: [[]]})
  const [layers, setLayers]  = useState<GeoJsonLayer[]>([])
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

  // updates user inputs state on every user interaction
  const updateInputs = (label: string,value: number) => {
      setInputs({...inputs,[label]: value})
  }

  const getElevation = () => floorHeight*floorNumber

  // called once on new file upload
  // creates ground and building layers based on default inputs
  const createDefaultBuilding = (land: string,building: string): void => {
    
        const ground = new GeoJsonLayer({  id: 'geojson-ground-layer',
                                                data: land,
                                                getLineColor: [0,0,0,255],
                                                getFillColor: [183, 244, 216,255],
                                                getLineWidth: () => 0.3,
                                                opacity: 1 })
  
        const storey = new GeoJsonLayer({   id: 'geojson-storey-building',
                                            data: JSON.parse(building),
                                            extruded: true,
                                            wireframe: true,
                                            getFillColor: [249,180,45,255],
                                            getLineColor: [0,0,0,255],
                                            getElevation,
                                            opacity: 1 })
        setLayers([ground, storey])    
    }
  
    useEffect(() => {   
      if (layers[0]) {
       generateBuldingLayer()
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[inputs])
  
    const generateBuldingLayer = () => {
      // called every time user inputs change
      const data = { type: 'MultiPolygon', coordinates: geojsonFileContents.current.coordinates }
      let building = JSON.stringify(geoTransform(data, lotCoverage, centerCoords))
      const storey = new GeoJsonLayer({
        id: 'geojson-storey-building',
        data: JSON.parse(building),
        extruded: true,
        wireframe: true,
        getFillColor: [249,180,45,255],
        getLineColor: [0,0,0,255],
        getElevation,
        opacity: 1,
      })
      setLayers([layers[0], storey])
      setMetrics({ landArea, buildingArea: landArea*(lotCoverage/100),
                  volume: landArea*(lotCoverage/100)*floorHeight*floorNumber,
                  buildingHeight: floorHeight*floorNumber })
    }

    useEffect(() => {   
      handleFileRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[layerSx])
  
    const handleFileRead = () => {
      // const result = fileReader?.result
      // if (typeof result !== 'string') {
      //     return;
      // }
      // const data = JSON.parse(result)

      console.log(layerSx);
      

      // let result = JSON.stringify(features) as any;
      // if (fileReader?.result) result = fileReader?.result;

      // const data = JSON.parse(result);

      // const { center, landArea, buildingArea, buildingHeight, volume } = computeGeoMatrics(data.coordinates[0],floorHeight,floorNumber,lotCoverage)
      // const { geometry: { coordinates: [longitude,latitude]}} = center
      // let multiploygon = geoTransform(data,lotCoverage,[longitude,latitude])
      // create feature object
      // let building = JSON.stringify({type: "Feature",properties:{}, geometry: multiploygon })
      // let building = JSON.stringify({"id":"000000b1-0556-4231-a52a-9b5b8b82dfbf","type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-3.9703075,55.7425473],[-3.9701862,55.7424916],[-3.9701342,55.7425277],[-3.9702899,55.7425992],[-3.9703201,55.7425783],[-3.9702857,55.7425625],[-3.9703075,55.7425473]]]},"properties":{"osid":"000000b1-0556-4231-a52a-9b5b8b82dfbf","toid":"osgb1000041024621","theme":"Buildings","changetype":"Modified Attributes","isobscured":false,"description":"Building","versiondate":"2022-09-18","geometry_area":59.20065,"height_source":"Ordnance Survey","physicallevel":"Surface Level","oslandusetiera":"Residential Accommodation","oslandusetierb":["Private Residence"],"geometry_source":"Ordnance Survey","oslandcovertiera":"Constructed","oslandcovertierb":["Building"],"oslanduse_source":"Ordnance Survey","height_updatedate":"2022-08-24","description_source":"Ordnance Survey","oslandcover_source":"Ordnance Survey","associatedstructure":null,"geometry_updatedate":"2006-08-30","height_evidencedate":"2022-06-20","capturespecification":"Urban","oslanduse_updatedate":"2006-08-30","absoluteheightmaximum":115.16,"absoluteheightminimum":105,"geometry_evidencedate":"2006-08-30","heightconfidencelevel":"Not Assessed","relativeheightmaximum":10.16,"absoluteheightroofbase":110.85,"description_updatedate":"2006-08-30","oslandcover_updatedate":"2006-08-30","oslanduse_evidencedate":"2006-08-30","relativeheightroofbase":5.85,"versionavailabletodate":null,"firstdigitalcapturedate":"1991-09-18","description_evidencedate":"2006-08-30","oslandcover_evidencedate":"2006-08-30","versionavailablefromdate":"2022-09-19T00:00:00Z"}})
      const {geojson, rel_h_max, os_topo_toid, rel_h2, tile_ref, bha_conf, abs_min, abs_h_max, abs_h2 } = layerSx;
      createDefaultBuilding(geojson,JSON.stringify(geojson))
      setViewState(prev => ({...prev, longitude: geojson.features[0].geometry.coordinates[0], latitude: geojson.features[0].geometry.coordinates[1], zoom: 18}))
      // geojsonFileContents.current = data
      setCenterCoords([geojson.features[0].geometry.coordinates[0],geojson.features[0].geometry.coordinates[1]])
      setMetrics({ landArea, buildingArea, buildingHeight: parseFloat(rel_h_max), volume })
      if (!(lotCoverage === 50 && floorHeight === 10 && floorNumber === 10)) {
        setInputs({ lotCoverage: 50, floorNumber: 10, floorHeight: 10 })
      }
    }
  
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const { name } = e.target.files[0]
        let allowedExtension = /.geojson/;
        if(!allowedExtension.exec(name)){
          alert('Invalid File type uploaded. Only .geojson files supported')
          return;
        }
        fileReader = new FileReader()
        fileReader.onloadend = handleFileRead
        fileReader.readAsText(e.target.files[0]);
        setFileName(e.target.files[0].name)
      }
    };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fileDownload = () => {
    let data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geneve));
    let a = document.createElement('a');
    a.href = 'data:' + data;
    a.download = 'data.geojson';
    a.innerHTML = 'download JSON';
    var container = document.getElementById('dwnldbtn')!;
    container.appendChild(a);
  }

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
                {/* <div className="button">
                  { !geojsonFileContents.current.type ? <Typography gutterBottom>No file loaded</Typography> : null }
                  <Button variant="contained" component="label">
                    LOAD GEOJSON
                    <input hidden accept='.geojson' onChange={handleFileChange} type="file" />
                  </Button>
                  <Typography >{fileName}</Typography>
                </div>
                <section>
                  <Slider disabled={landArea ? false : true} label='lotCoverage' inputs={inputs} updateInputs={updateInputs} symbol='%' />
                  <Slider disabled={landArea ? false : true} label='floorNumber' inputs={inputs} updateInputs={updateInputs} />
                  <Slider disabled={landArea ? false : true} label='floorHeight' inputs={inputs} updateInputs={updateInputs} />
                </section> */}
                <section>
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
                    <Link href={genHrefAttribute(geneve)} download='geneve.geojson'>Geneve</Link>
                    <Link href={genHrefAttribute(corseaux)} download='corseaux.geojson'>Corseaux</Link>
                    <Link href={genHrefAttribute(lausanne)} download='lausanne.geojson'>Lausanne</Link>
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