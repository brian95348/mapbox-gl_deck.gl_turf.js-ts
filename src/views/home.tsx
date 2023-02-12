import React, { useState, useEffect } from "react";
// eslint-disable-next-line import/no-webpack-loader-syntax
import mapboxgl from 'mapbox-gl';
import { DeckGL } from '@deck.gl/react/typed'
import {GeoJsonLayer} from '@deck.gl/layers/typed'
import { Map } from 'react-map-gl' 
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

// Interfaces
import UserInputs from "../models/user-inputs";
import Metrics from "../models/metrics";
import MapViewState from "../models/map-view-state";
import OnStateChangeParameters from "../models/map-onmove-state";
import FileContents from "../models/file";

// Components
import Slider from "../components/slider";
import MetricDisplay from "../components/metric-display";

// utils
import { computeGeoMatrics, geoTransform } from "../utils/geo-operations";

import './home.css'

mapboxgl.accessToken = 'pk.eyJ1IjoiYnJpYW4yM21hcGJveCIsImEiOiJjbGR1Y3FudWIwNGtoM3FvNWF0ZjBtb2Z1In0.fsi9kFZgx1r5HR_tAxn9_g';



const Home = (): JSX.Element => {
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
        setMetrics({ landArea, buildingArea: landArea*lotCoverage,
                    volume: landArea*lotCoverage*floorHeight*floorNumber,
                    buildingHeight: floorHeight*floorNumber })
      }
    
      const handleFileRead = () => {
        const result = fileReader.result
        if (typeof result !== 'string') {
            return;
        }
        const data = JSON.parse(result)
        const { center, landArea, buildingArea, buildingHeight } = computeGeoMatrics(data.coordinates[0],floorHeight,floorNumber,lotCoverage)
        const { geometry: { coordinates: [longitude,latitude]}} = center
        let multiploygon = geoTransform(data,lotCoverage,[longitude,latitude])
        // create feature object
        let building = JSON.stringify({type: "Feature",properties:{}, geometry: multiploygon })
        createDefaultBuilding(data,building)
        setViewState(prev => ({...prev, longitude, latitude, zoom: 18}))
        geojsonFileContents.current = data
        setCenterCoords([longitude,latitude])
        setMetrics({ landArea, buildingArea, buildingHeight, volume })
        if (!(lotCoverage === 50 && floorHeight === 10 && floorNumber === 10)) {
          setInputs({ lotCoverage: 50, floorNumber: 10, floorHeight: 10 })
        }
      }
    
      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          fileReader = new FileReader()
          fileReader.onloadend = handleFileRead
          fileReader.readAsText(e.target.files[0]);
          setFileName(e.target.files[0].name)
        }
      };
    
    const updateViewState = (state: OnStateChangeParameters )  => {
        const { viewState } = state
        setViewState(viewState);
    };

    return (
        <div>
          <div className='app-wrapper'>
            <div className='controls'>
              <div className="button">
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
              </section>
            </div>
            <DeckGL
              viewState={viewState}
              layers={layers}
              controller={true}
              onViewStateChange={updateViewState}
            >
                <Map mapboxAccessToken={mapboxgl.accessToken} mapStyle="mapbox://styles/mapbox/streets-v9" />
            </DeckGL> 
            <div className='statistiques'>
                <Typography id="input-slider" variant="h4" gutterBottom>
                  Statistiques
                </Typography>
                <MetricDisplay value={landArea} unit='m2' label='Land Area' />
                <MetricDisplay value={buildingArea} unit='m2' label='Building Area' />
                <MetricDisplay value={buildingArea} unit='m2' label='Building Floor Area' />
                <MetricDisplay value={volume} unit='m3' label='Volume' />
                <MetricDisplay value={buildingHeight} unit='m' label='Building Height' />
            </div>
          </div>  
        </div>
      );
}

export default Home