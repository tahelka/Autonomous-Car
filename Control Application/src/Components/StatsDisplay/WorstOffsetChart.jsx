import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Box, Button } from '@mui/material';

const WorstOffsetChart = ({ worstOffsets }) => {
  const [viewWindow, setViewWindow] = useState(10); // Default to showing 10 trips at a time

  const createChartData = () => {
    const visibleData = worstOffsets.slice(-viewWindow); // Show only the last `viewWindow` number of trips
    
    return {
      labels: visibleData.map(offset => offset.trip_id),
      datasets: [
        {
          label: 'Worst Offset',
          data: visibleData.map(offset => offset.worst_offset),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
        }
      ]
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Worst Offset per Trip', font: { size: 16 } },
    },
    scales: {
      x: {
        title: { display: true, text: 'Trip ID' },
      },
      y: {
        title: { display: true, text: 'Worst Offset' },
        min: 0,
        suggestedMax: 7,  
        ticks: {
          stepSize: 1,  
        },
      }
    },
    animation: { duration: 0 },
    elements: { line: { borderWidth: 2 } },
  };

  const handleZoom = (direction) => {
    setViewWindow(prev => {
      if (direction === 'in') return Math.max(5, prev - 5);
      if (direction === 'out') return Math.min(worstOffsets.length, prev + 5);
      return prev;
    });
  };

  return (
    <Box sx={{ width: '100%', textAlign: 'center' }}>
      <Box sx={{ height: '400px', width: '800px', margin: '0 auto' }}>
        <Line data={createChartData()} options={options} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
        <Button variant="contained" color="primary" onClick={() => handleZoom('in')}>
          Zoom In
        </Button>
        <Button variant="contained" color="primary" onClick={() => handleZoom('out')}>
          Zoom Out
        </Button>
      </Box>
    </Box>
  );
};

export default WorstOffsetChart;