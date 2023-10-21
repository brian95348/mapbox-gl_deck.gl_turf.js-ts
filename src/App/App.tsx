import React from 'react';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

import { Main } from '../views';

function App() {
  return (
    <div className="App" data-testid="App">
      <Main />
    </div>
  );
}

export default App;
