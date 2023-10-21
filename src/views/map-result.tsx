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
  geo: any;
}

export default function MapResult({ geo }: MapResultProps) {
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
  // const updateInputs = (label: string,value: number) => {
  //     setInputs({...inputs,[label]: value})
  // }

  // const getElevation = () => floorHeight*floorNumber

  // called once on new file upload
  // creates ground and building layers based on default inputs
  const createDefaultBuilding = (land: string,building: string, buildingHeight: number): void => {
    
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
                                            getElevation: buildingHeight,
                                            opacity: 1 })
        setLayers([ground, storey])    
    }
  
    // useEffect(() => {   
    //   if (layers[0]) {
    //    generateBuldingLayer()
    //   }
    // // eslint-disable-next-line react-hooks/exhaustive-deps
    // },[inputs])
  
    // const generateBuldingLayer = () => {
    //   // called every time user inputs change
    //   const data = { type: 'MultiPolygon', coordinates: geojsonFileContents.current.coordinates }
    //   let building = JSON.stringify(geoTransform(data, lotCoverage, centerCoords))
    //   const storey = new GeoJsonLayer({
    //     id: 'geojson-storey-building',
    //     data: JSON.parse(building),
    //     extruded: true,
    //     wireframe: true,
    //     getFillColor: [249,180,45,255],
    //     getLineColor: [0,0,0,255],
    //     getElevation,
    //     opacity: 1,
    //   })
    //   setLayers([layers[0], storey])
    //   setMetrics({ landArea, buildingArea: landArea*(lotCoverage/100),
    //               volume: landArea*(lotCoverage/100)*floorHeight*floorNumber,
    //               buildingHeight: floorHeight*floorNumber })
    // }

    useEffect(() => {   
      handleFileRead(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[geo])
  
    const handleFileRead = (isFileUpload: boolean) => {
      // const result = fileReader?.result
      // if (typeof result !== 'string') {
      //     return;
      // }
      // const data = JSON.parse(result)

      let result = JSON.stringify(glasgow) as any;
      if (fileReader?.result) result = fileReader?.result;

      let geojson = JSON.parse(result);
      if (!isFileUpload) geojson = geo.geojson;

      console.log(geojson);

      const { center, landArea, buildingArea, buildingHeight, volume } = computeGeoMatrics(geojson.features[0].geometry.coordinates,floorHeight,floorNumber,lotCoverage)
      const { geometry: { coordinates: [longitude,latitude]}} = center
      createDefaultBuilding(geojson, JSON.stringify(geojson), geojson.features[0].properties.RelHMax)
      setViewState(prev => ({...prev, longitude, latitude, zoom: 18}))
      geojsonFileContents.current = geojson
      setCenterCoords([longitude,latitude])
      setMetrics({ landArea, buildingArea, buildingHeight: geojson.features[0].properties.RelHMax, volume })
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
                {/* <section>
                  <Slider disabled={landArea ? false : true} label='lotCoverage' inputs={inputs} updateInputs={updateInputs} symbol='%' />
                  <Slider disabled={landArea ? false : true} label='floorNumber' inputs={inputs} updateInputs={updateInputs} />
                  <Slider disabled={landArea ? false : true} label='floorHeight' inputs={inputs} updateInputs={updateInputs} />
                </section> */}
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
                    <Link href={genHrefAttribute(glasgow)} download='glasgow.geojson'>Glasgow</Link>
                    {/* <Link href={genHrefAttribute(corseaux)} download='corseaux.geojson'>Corseaux</Link>
                    <Link href={genHrefAttribute(lausanne)} download='lausanne.geojson'>Lausanne</Link> */}
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