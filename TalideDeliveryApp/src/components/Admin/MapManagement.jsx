// MapManagement.js
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from "./MapManagement.module.css";
import axios from 'axios';
import MapCreator from './MapCreator';
import MapViewer from '../DisplayMapVehicle/MapViewer';
import DrawMapFromJsonForAdmin from '../DisplayMapVehicle/DrawMapFromJsonForAdmin';

const MapManagement = () => {
  const [maps, setMaps] = useState([]);
  const [selectedMapJson, setSelectedMapJson] = useState(null);
  const [mode, setMode] = useState('view'); // 'view' or 'create'
  const [gridSize, setGridSize] = useState(2); // Default grid size to 2

  const fetchMaps = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/maps');
      const sortedMaps = response.data.sort((a, b) => new Date(a.creation_time) - new Date(b.creation_time));
      setMaps(sortedMaps);
    } catch (error) {
      console.error('Error fetching maps:', error);
    }
  };

  const fetchMapJsonByIndex = async (index) => {
    try {
      if (index === -1) {
        setSelectedMapJson(null);
        return;
      }
      const mapId = maps[index].id;
      const jsonUrl = `http://localhost:5000/download/map_${mapId}.json`;
      const jsonResp = await axios.get(jsonUrl);
      setSelectedMapJson(JSON.stringify(jsonResp.data));
    } catch (error) {
      console.error('Error fetching map JSON:', error);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  const addNewMap = (newMap) => {
    setMaps([...maps, newMap]);
    fetchMaps();
    setMode('view'); // Switch to view mode after adding a new map
  };

  const handleDeleteMap = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/maps/delete/${id}`);
      await fetchMaps(); // Re-fetch maps to update the state
      console.log(`Map with id ${id} deleted`);
    } catch (error) {
      console.error('Error deleting map:', error);
    }
  };

  const handleSetGridSize = () => {
    setMode('create');
  };

  const handleGridSizeChange = (event) => {
    setGridSize(Number(event.target.value));
  };

  return (
    <div className={styles.MapManagement}>
      {mode === 'view' ? (
        <div className={styles.mapAdministrater}>
          <MapViewer maps={maps} onDeleteMap={handleDeleteMap} onMapSelect={fetchMapJsonByIndex} />
          <div className={styles.mapDisplay}>
            {selectedMapJson ? (
              <DrawMapFromJsonForAdmin jsonData={selectedMapJson} />
            ) : (
              <p>No map selected</p>
            )}
          </div>
          <label>
            Grid Size:
            <input 
              type="number" 
              value={gridSize} 
              onChange={handleGridSizeChange} 
              min="2" // Minimum value set to 2
            />
          </label>
          <button onClick={handleSetGridSize} className='choiceButton'>Create new map</button>
        </div>
      ) : (
        <div className={styles.mapCreator}>
          <MapCreator addNewMap={addNewMap} onCancel={() => setMode('view')} gridSize={gridSize} />
        </div>
      )}
    </div>
  );
};

MapManagement.propTypes = {};

export default MapManagement;
