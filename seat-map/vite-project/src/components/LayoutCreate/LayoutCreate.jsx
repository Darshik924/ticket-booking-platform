import { useState, useEffect, Fragment, useRef, useCallback } from 'react'
import panzoom from 'panzoom'
import ImageUpload from '../ImageUpload/ImageUpload.jsx'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import layout from './layout.json'

function LayoutCreate({ setDisplayLayout, formData, venueDetail }) {
  const [count, setCount] = useState(0)
  const [venue, setVenue] = useState(null)
  const [radius, setRadius] = useState([])
  const [inverted, setInverted] = useState([])
  const [remaining, setRemaining] = useState([])
  const [arcPoints, setarcPoints] = useState([])
  const [polygonPoints, setpolygonPoints] = useState([])
  const [linePoints, setlinePoints] = useState([])
  const [figure, setFigure] = useState('line')
  const [lastPoints, setLastPoints] = useState([])
  const [polysides, setPolysides] = useState([])
  const [tempSide, setTempSide] = useState()
  const [tempPolygon, setTempPolygon] = useState([])
  const [polyarc, setPolyarc] = useState([])
  const [doneSeats, setDoneSeats] = useState([])
  const [temppolyarc, setTemppolyarc] = useState([])
  const [clicked, setClicked] = useState(false)
  const [Image, setImage] = useState(null)
  const [sectionName, setSectionName] = useState([])
  const [isSectionCreated, setIsSectionCreated] = useState(true)
  const [editClicked, seteditClicked] = useState(false);
  const [displayOnly, setDisplayOnly] = useState(false);
  const [layoutClicked, setLayoutClicked] = useState(false);
  const [coorDifference, setCoorDifference] = useState({})
  const sceneRef = useRef()
  const currentCordinates = useRef(null)
  const isDragged = useRef(false)
  const sectionNameInput = useRef({})
  const sectionPriceInput = useRef({})
  const seatLayoutRows = useRef({})
  const seatLayoutCols = useRef({})
  const seatLayoutType = useRef({})
  const seatNameRef = useRef({})
  const seatPriceRef = useRef({})
  const seatTierRef = useRef({})
  const rows = 50
  const columns = 50
  const panzoomInstance = useRef(null);
  const [seatLayout, setseatLayout] = useState({})
  const [selectedSeat, setSelectedSeat] = useState([])
  const [hoveredSeat, setHoveredSeat] = useState(null)
  const [hoveredSection, setHoveredSection] = useState('')
  const [clickedSection, setClickedSection] = useState('')
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [GridMouseDown, setGridMouseDown] = useState(false);
  const layoutRef = useRef(null)
  const width = Math.max(window.innerHeight * 0.70, 350)
  const [editingSections, setEditingSections] = useState([])
  const [editingSectionSeat, setEditingSectionSeat] = useState([])
  // Tracks selected seats for deletion. 
  const [selectedSeats, setSelectedSeats] = useState(new Set());
  const [selectDeleteSeat, setSelectDeleteSeat] = useState([]);
  const { venueId } = useParams()

  // Tracks the seat currently opened for detail editing
  const [editingSeat, setEditingSeat] = useState(null);

  // This is to stop scrolling the page when changing input
  const containerRef = useRef(null);

  useEffect(() => {
    if (venueId) {
      axios.get(`http://localhost:5000/api/events/venue/${venueId}`)
        .then((response) => {
          setseatLayout(response.data.venue.seatLayout)
          console.log(response.data.venue)
          setVenue(response.data.venue)
        })
        .catch((error) => {
          console.error(error)
        })
    }
  }, [])
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // 1. Check if target is a number input
      if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
        const input = e.target;

        // Stop page scroll
        e.preventDefault();

        // 2. Read attributes
        const step = parseFloat(input.step) || 1;
        const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
        const max = input.max !== '' ? parseFloat(input.max) : Infinity;
        const currentValue = parseFloat(input.value) || 0;

        // 3. Calculate new value based on scroll direction
        let newValue = e.deltaY < 0 ? currentValue + step : currentValue - step;

        // Respect min and max boundaries
        newValue = Math.max(min, Math.min(max, newValue));

        // Format to avoid floating point accuracy issues (e.g., 0.1 + 0.2 = 0.30000000000000004)
        const stepDecimals = (step.toString().split('.')[1] || '').length;
        const formattedValue = newValue.toFixed(stepDecimals);

        // 4. Force React to recognize the value change
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        ).set;

        nativeInputValueSetter.call(input, formattedValue);

        // 5. Dispatch 'input' event so React onChange handlers fire
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => container.removeEventListener('wheel', handleWheel);
  }, []);


  // Global click delegation handler on the SVG groups
  const handleSeatClickBefore = (e, groupIdx, index) => {
    const seat = e.target.closest('circle')
    if (!seat) return;

    const row = parseInt(seat.dataset.row, 10)
    const col = parseInt(seat.dataset.col, 10)
    const secIdx = index
    const grpIdx = groupIdx

    const seatKey = `${secIdx}_${grpIdx}_${col}_${row}`;

    // If holding Shift or Ctrl/Cmd key, toggle multi-select mode for deletion
    if (!sectionName[secIdx].seatDone) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedSeats((prev) => {
          const next = new Set(prev);
          if (next.has(seatKey)) next.delete(seatKey);
          else next.add(seatKey);
          return next;
        });
      } else {
        if (JSON.stringify(editingSeat) === JSON.stringify({ secIdx, grpIdx, col, row, seatKey })) {
          setEditingSeat(null)
        } else {
          setEditingSeat({ secIdx, grpIdx, col, row, seatKey });
        }
      }
    }
  };

  // Bulk Delete Handler
  const deleteSelectedSeats = () => {
    let val = [...selectedSeats]
    for (let value of val) {
      let arr = value.split('_')
      for (let i = 0; i < 4; i++) {
        arr[i] = parseInt(arr[i])
      }
      let newSectionName = [...sectionName]
      newSectionName[arr[0]].seats[arr[1]]?.deletedSeats.push(`row${arr[3]}-col${arr[2]}`)
      setSectionName(newSectionName)
    }
    if (editingSeat && selectedSeats.has(editingSeat.seatKey)) {
      setEditingSeat(null)
    }
    setSelectedSeats(new Set());
  };

  const makeFigure = (event) => {

    if (figure === 'arc') {

      setRadius([...radius, 100])
      setInverted([...inverted, 0])
      setRemaining([...remaining, 0])
      setarcPoints([...arcPoints, [event.X, event.Y]]);
      setLastPoints([...lastPoints, figure])
    }
    else if (figure === 'line') {

      setlinePoints([...linePoints, [event.X, event.Y]]);
      setLastPoints([...lastPoints, figure])
    }
    else if (figure === 'polygon' && clicked) {
      const svg = sceneRef.current;
      const point = svg.createSVGPoint();
      point.x = event.X;
      point.y = event.Y;
      const svgCoords = point.matrixTransform(svg.getScreenCTM().inverse());
      let x = svgCoords.x
      let y = svgCoords.y
      if (tempPolygon.length < tempSide - 1) {
        if (event.button === 0) {
          setTempPolygon([...tempPolygon, ({ x, y, figure: 'line' })])
          setTemppolyarc([...temppolyarc, ({})])
        } else {
          setTempPolygon([...tempPolygon, ({ x, y, figure: 'arc' })])
          setTemppolyarc([...temppolyarc, ({ radius: 100, inverted: 0, remaining: 0 })])
        }
      }
      else if (tempPolygon.length === tempSide - 1) {
        if (event.button === 0) {
          setpolygonPoints([...polygonPoints, [...tempPolygon, ({ x, y, figure: 'line' })]])
          setPolyarc([...polyarc, [...temppolyarc, ({})]])
        } else {
          setpolygonPoints([...polygonPoints, [...tempPolygon, ({ x, y, figure: 'arc' })]])
          setPolyarc([...polyarc, [...temppolyarc, ({ radius: 100, inverted: 0, remaining: 0 })]])
        }
        setTempPolygon([])
        setTemppolyarc([])
        setLastPoints([...lastPoints, figure])
        setClicked(false)
        setIsSectionCreated(true)
      }
    }
  }

  const undo = useCallback(() => {
    if (lastPoints[lastPoints.length - 1] === 'line') {

      setlinePoints((linePoints) => {
        let new_linePoints = [...linePoints]
        new_linePoints.pop()
        new_linePoints.pop()
        return new_linePoints
      })
      setLastPoints((lastPoints) => {
        let new_lastPoints = [...lastPoints]
        new_lastPoints.pop()
        new_lastPoints.pop()
        return new_lastPoints
      })
    }
    else if (lastPoints[lastPoints.length - 1] === 'arc') {

      setarcPoints((arcPoints) => {
        let new_arcPoints = [...arcPoints]
        new_arcPoints.pop()
        new_arcPoints.pop()
        return new_arcPoints
      })
      setLastPoints((lastPoints) => {
        let new_lastPoints = [...lastPoints]
        new_lastPoints.pop()
        new_lastPoints.pop()
        return new_lastPoints
      })
    }
    else if (lastPoints[lastPoints.length - 1] === 'polygon') {
      if (sectionName.length === polygonPoints.length) {
        setSectionName((lastName) => {
          let newSectionName = [...lastName]
          newSectionName.pop()
          return newSectionName
        })
      }
      setpolygonPoints((polygonPoints) => {
        let new_polyPoints = [...polygonPoints]
        new_polyPoints?.pop()
        return new_polyPoints
      })
      setLastPoints((lastPoints) => {
        let new_lastPoints = [...lastPoints]
        new_lastPoints?.pop()
        return new_lastPoints
      })
      setPolysides((polysides) => {
        let new_polySides = [...polysides]
        new_polySides?.pop()
        return new_polySides
      })
    }
  }, [linePoints, arcPoints, polygonPoints, sectionName, polysides, lastPoints])

  const changeFigure = (event) => {
    setFigure(event.target.value)
  }

  // CTRL + Z for undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.id === 'url-upload') {
        return
      }
      if (e.ctrlKey && e.key === "z") {
        console.log("Global undo triggered");
        undo();
      }
    };

    // Listen to the entire browser window instead of a single element
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo]); // Include undo in dependencies if it changes dynamically

  useEffect(() => {
    if (sceneRef.current) {

      panzoomInstance.current = panzoom(sceneRef.current, {
        maxZoom: 40,
        minZoom: 1,
        zoomSpeed: 0.065,
        bounds: true,
        boundsPadding: 1,
        beforeMouseDown: (event) => {
          // Check if the clicked element (or its parents) has the 'dont-pan' class
          const isIgnored = event.target.closest('.dont-pan');
          if (isIgnored) {
            return true; // Return true to ignore the panzoom action
          }
        },
        beforeTouchStart: (event) => {
          // Do the same for touch devices
          const isIgnored = event.target.closest('.dont-pan');
          if (isIgnored) {
            return true;
          }
        }

      });
      panzoomInstance.current.on('transform', (e) => {
        const currentTransform = e.getTransform();
        if (JSON.stringify(currentTransform) !== JSON.stringify(transform)) {
          setTransform({
            x: currentTransform.x,
            y: currentTransform.y,
            scale: currentTransform.scale
          });
        }
      });
    }

    // CRITICAL: Clean up event listeners when the component unmounts
    return () => {
      if (panzoomInstance.current) {
        panzoomInstance.current.dispose();
      }
    };
  }, []);


  useEffect(() => {
    (async function loadLayout() {
      // const URL = ""
      // const response = await axios.get(URL)
      // setseatLayout(response.data)

      // const Layout = layout
      // const Layout = { "displayOnly1": { "name": "", "price": "", "textX": 95.7568130493164, "textY": 351.6415100097656, "textAngle": 0, "textFont": 10, "color": "#7e7777", "seats": {}, "points": { "point1": { "x": 95.7568130493164, "y": 351.6415100097656, "figure": "line" }, "point2": { "x": 639.3809814453125, "y": 351.6415100097656, "figure": "arc", "radius": 100, "inverted": 0, "remaining": 0 }, "point3": { "x": 639.3809814453125, "y": 351.6415100097656, "figure": "line" }, "point4": { "x": 95.7568130493164, "y": 351.6415100097656, "figure": "arc", "radius": 100, "inverted": 0, "remaining": 0 } }, "d": "M95.7568130493164 351.6415100097656 A100 100 0 0 0 639.3809814453125 351.6415100097656 L639.3809814453125 351.6415100097656 A100 100 0 0 0 95.7568130493164 351.6415100097656 Z" }, "section1": { "name": "A", "price": "", "textX": 367, "textY": 124, "textAngle": 0, "textFont": 10, "color": "#2e8576", "seats": { "layout1": { "rows": 14, "columns": 50, "type": "linear", "seat_data": { "row0-col0": { "seatName": "row:0-col:0", "seatPrice": "4500", "seatTier": "premium", "x": 1, "y": 1 }, "row0-col1": { "x": 4.1, "y": 1, "seatName": "AA-2", "seatTier": "none" }, "row0-col2": { "x": 7.2, "y": 1, "seatName": "AA-3", "seatTier": "none" }, "row0-col3": { "x": 10.3, "y": 1, "seatName": "AA-4", "seatTier": "none" }, "row0-col4": { "x": 13.4, "y": 1, "seatName": "AA-5", "seatTier": "none" }, "row0-col5": { "x": 16.5, "y": 1, "seatName": "AA-6", "seatTier": "none" }, "row0-col6": { "x": 19.6, "y": 1, "seatName": "AA-7", "seatTier": "none" }, "row0-col7": { "x": 22.700000000000003, "y": 1, "seatName": "AA-8", "seatTier": "none" }, "row0-col8": { "x": 25.8, "y": 1, "seatName": "AA-9", "seatTier": "none" }, "row0-col9": { "x": 28.9, "y": 1, "seatName": "AA-10", "seatTier": "none" }, "row0-col10": { "x": 32, "y": 1, "seatName": "AA-11", "seatTier": "none" }, "row0-col11": { "x": 35.1, "y": 1, "seatName": "AA-12", "seatTier": "none" }, "row0-col12": { "x": 38.2, "y": 1, "seatName": "AA-13", "seatTier": "none" }, "row0-col13": { "x": 41.3, "y": 1, "seatName": "AA-14", "seatTier": "none" }, "row0-col14": { "x": 44.400000000000006, "y": 1, "seatName": "AA-15", "seatTier": "none" }, "row0-col15": { "x": 47.5, "y": 1, "seatName": "AA-16", "seatTier": "none" }, "row0-col16": { "x": 50.6, "y": 1, "seatName": "AA-17", "seatTier": "none" }, "row0-col17": { "x": 53.7, "y": 1, "seatName": "AA-18", "seatTier": "none" }, "row0-col18": { "x": 56.8, "y": 1, "seatName": "AA-19", "seatTier": "none" }, "row0-col19": { "x": 59.900000000000006, "y": 1, "seatName": "AA-20", "seatTier": "none" }, "row0-col20": { "x": 63, "y": 1, "seatName": "AA-21", "seatTier": "none" }, "row0-col21": { "x": 66.1, "y": 1, "seatName": "AA-22", "seatTier": "none" }, "row0-col22": { "x": 69.2, "y": 1, "seatName": "AA-23", "seatTier": "none" }, "row0-col23": { "x": 72.3, "y": 1, "seatName": "AA-24", "seatTier": "none" }, "row0-col24": { "x": 75.4, "y": 1, "seatName": "AA-25", "seatTier": "none" }, "row0-col25": { "x": 78.5, "y": 1, "seatName": "AA-26", "seatTier": "none" }, "row0-col26": { "x": 81.6, "y": 1, "seatName": "AA-27", "seatTier": "none" }, "row0-col27": { "x": 84.7, "y": 1, "seatName": "AA-28", "seatTier": "none" }, "row0-col28": { "x": 87.80000000000001, "y": 1, "seatName": "AA-29", "seatTier": "none" }, "row0-col29": { "x": 90.9, "y": 1, "seatName": "AA-30", "seatTier": "none" }, "row0-col30": { "x": 94, "y": 1, "seatName": "AA-31", "seatTier": "none" }, "row0-col31": { "x": 97.1, "y": 1, "seatName": "AA-32", "seatTier": "none" }, "row0-col32": { "x": 100.2, "y": 1, "seatName": "AA-33", "seatTier": "none" }, "row0-col33": { "x": 103.30000000000001, "y": 1, "seatName": "AA-34", "seatTier": "none" }, "row0-col34": { "x": 106.4, "y": 1, "seatName": "AA-35", "seatTier": "none" }, "row0-col35": { "x": 109.5, "y": 1, "seatName": "AA-36", "seatTier": "none" }, "row0-col36": { "x": 112.6, "y": 1, "seatName": "AA-37", "seatTier": "none" }, "row0-col37": { "x": 115.7, "y": 1, "seatName": "AA-38", "seatTier": "none" }, "row0-col38": { "x": 118.80000000000001, "y": 1, "seatName": "AA-39", "seatTier": "none" }, "row0-col39": { "x": 121.9, "y": 1, "seatName": "AA-40", "seatTier": "none" }, "row0-col40": { "x": 125, "y": 1, "seatName": "AA-41", "seatTier": "none" }, "row0-col41": { "x": 128.1, "y": 1, "seatName": "AA-42", "seatTier": "none" }, "row0-col42": { "x": 131.2, "y": 1, "seatName": "AA-43", "seatTier": "none" }, "row0-col43": { "x": 134.3, "y": 1, "seatName": "AA-44", "seatTier": "none" }, "row0-col44": { "x": 137.4, "y": 1, "seatName": "AA-45", "seatTier": "none" }, "row0-col45": { "x": 140.5, "y": 1, "seatName": "AA-46", "seatTier": "none" }, "row0-col46": { "x": 143.6, "y": 1, "seatName": "AA-47", "seatTier": "none" }, "row0-col47": { "x": 146.7, "y": 1, "seatName": "AA-48", "seatTier": "none" }, "row0-col48": { "x": 149.8, "y": 1, "seatName": "AA-49", "seatTier": "none" }, "row0-col49": { "x": 152.9, "y": 1, "seatName": "AA-50", "seatTier": "none" }, "row1-col0": { "x": 1, "y": 3.9, "seatName": "AB-1", "seatTier": "none" }, "row1-col1": { "x": 4.1, "y": 3.9, "seatName": "AB-2", "seatTier": "none" }, "row1-col2": { "x": 7.2, "y": 3.9, "seatName": "AB-3", "seatTier": "none" }, "row1-col3": { "x": 10.3, "y": 3.9, "seatName": "AB-4", "seatTier": "none" }, "row1-col4": { "x": 13.4, "y": 3.9, "seatName": "AB-5", "seatTier": "none" }, "row1-col5": { "x": 16.5, "y": 3.9, "seatName": "AB-6", "seatTier": "none" }, "row1-col6": { "x": 19.6, "y": 3.9, "seatName": "AB-7", "seatTier": "none" }, "row1-col7": { "x": 22.700000000000003, "y": 3.9, "seatName": "AB-8", "seatTier": "none" }, "row1-col8": { "x": 25.8, "y": 3.9, "seatName": "AB-9", "seatTier": "none" }, "row1-col9": { "x": 28.9, "y": 3.9, "seatName": "AB-10", "seatTier": "none" }, "row1-col10": { "x": 32, "y": 3.9, "seatName": "AB-11", "seatTier": "none" }, "row1-col11": { "x": 35.1, "y": 3.9, "seatName": "AB-12", "seatTier": "none" }, "row1-col12": { "x": 38.2, "y": 3.9, "seatName": "AB-13", "seatTier": "none" }, "row1-col13": { "x": 41.3, "y": 3.9, "seatName": "AB-14", "seatTier": "none" }, "row1-col14": { "x": 44.400000000000006, "y": 3.9, "seatName": "AB-15", "seatTier": "none" }, "row1-col15": { "x": 47.5, "y": 3.9, "seatName": "AB-16", "seatTier": "none" }, "row1-col16": { "x": 50.6, "y": 3.9, "seatName": "AB-17", "seatTier": "none" }, "row1-col17": { "x": 53.7, "y": 3.9, "seatName": "AB-18", "seatTier": "none" }, "row1-col18": { "x": 56.8, "y": 3.9, "seatName": "AB-19", "seatTier": "none" }, "row1-col19": { "x": 59.900000000000006, "y": 3.9, "seatName": "AB-20", "seatTier": "none" }, "row1-col20": { "x": 63, "y": 3.9, "seatName": "AB-21", "seatTier": "none" }, "row1-col21": { "x": 66.1, "y": 3.9, "seatName": "AB-22", "seatTier": "none" }, "row1-col22": { "x": 69.2, "y": 3.9, "seatName": "AB-23", "seatTier": "none" }, "row1-col23": { "x": 72.3, "y": 3.9, "seatName": "AB-24", "seatTier": "none" }, "row1-col24": { "x": 75.4, "y": 3.9, "seatName": "AB-25", "seatTier": "none" }, "row1-col25": { "x": 78.5, "y": 3.9, "seatName": "AB-26", "seatTier": "none" }, "row1-col26": { "x": 81.6, "y": 3.9, "seatName": "AB-27", "seatTier": "none" }, "row1-col27": { "x": 84.7, "y": 3.9, "seatName": "AB-28", "seatTier": "none" }, "row1-col28": { "x": 87.80000000000001, "y": 3.9, "seatName": "AB-29", "seatTier": "none" }, "row1-col29": { "x": 90.9, "y": 3.9, "seatName": "AB-30", "seatTier": "none" }, "row1-col30": { "x": 94, "y": 3.9, "seatName": "AB-31", "seatTier": "none" }, "row1-col31": { "x": 97.1, "y": 3.9, "seatName": "AB-32", "seatTier": "none" }, "row1-col32": { "x": 100.2, "y": 3.9, "seatName": "AB-33", "seatTier": "none" }, "row1-col33": { "x": 103.30000000000001, "y": 3.9, "seatName": "AB-34", "seatTier": "none" }, "row1-col34": { "x": 106.4, "y": 3.9, "seatName": "AB-35", "seatTier": "none" }, "row1-col35": { "x": 109.5, "y": 3.9, "seatName": "AB-36", "seatTier": "none" }, "row1-col36": { "x": 112.6, "y": 3.9, "seatName": "AB-37", "seatTier": "none" }, "row1-col37": { "x": 115.7, "y": 3.9, "seatName": "AB-38", "seatTier": "none" }, "row1-col38": { "x": 118.80000000000001, "y": 3.9, "seatName": "AB-39", "seatTier": "none" }, "row1-col39": { "x": 121.9, "y": 3.9, "seatName": "AB-40", "seatTier": "none" }, "row1-col40": { "x": 125, "y": 3.9, "seatName": "AB-41", "seatTier": "none" }, "row1-col41": { "x": 128.1, "y": 3.9, "seatName": "AB-42", "seatTier": "none" }, "row1-col42": { "x": 131.2, "y": 3.9, "seatName": "AB-43", "seatTier": "none" }, "row1-col43": { "x": 134.3, "y": 3.9, "seatName": "AB-44", "seatTier": "none" }, "row1-col44": { "x": 137.4, "y": 3.9, "seatName": "AB-45", "seatTier": "none" }, "row1-col45": { "x": 140.5, "y": 3.9, "seatName": "AB-46", "seatTier": "none" }, "row1-col46": { "x": 143.6, "y": 3.9, "seatName": "AB-47", "seatTier": "none" }, "row1-col47": { "x": 146.7, "y": 3.9, "seatName": "AB-48", "seatTier": "none" }, "row1-col48": { "x": 149.8, "y": 3.9, "seatName": "AB-49", "seatTier": "none" }, "row1-col49": { "x": 152.9, "y": 3.9, "seatName": "AB-50", "seatTier": "none" }, "row2-col0": { "x": 1, "y": 6.8, "seatName": "AC-1", "seatTier": "none" }, "row2-col1": { "x": 4.1, "y": 6.8, "seatName": "AC-2", "seatTier": "none" }, "row2-col2": { "x": 7.2, "y": 6.8, "seatName": "AC-3", "seatTier": "none" }, "row2-col3": { "x": 10.3, "y": 6.8, "seatName": "AC-4", "seatTier": "none" }, "row2-col4": { "x": 13.4, "y": 6.8, "seatName": "AC-5", "seatTier": "none" }, "row2-col5": { "x": 16.5, "y": 6.8, "seatName": "AC-6", "seatTier": "none" }, "row2-col6": { "x": 19.6, "y": 6.8, "seatName": "AC-7", "seatTier": "none" }, "row2-col7": { "x": 22.700000000000003, "y": 6.8, "seatName": "AC-8", "seatTier": "none" }, "row2-col8": { "x": 25.8, "y": 6.8, "seatName": "AC-9", "seatTier": "none" }, "row2-col9": { "x": 28.9, "y": 6.8, "seatName": "AC-10", "seatTier": "none" }, "row2-col10": { "x": 32, "y": 6.8, "seatName": "AC-11", "seatTier": "none" }, "row2-col11": { "x": 35.1, "y": 6.8, "seatName": "AC-12", "seatTier": "none" }, "row2-col12": { "x": 38.2, "y": 6.8, "seatName": "AC-13", "seatTier": "none" }, "row2-col13": { "x": 41.3, "y": 6.8, "seatName": "AC-14", "seatTier": "none" }, "row2-col14": { "x": 44.400000000000006, "y": 6.8, "seatName": "AC-15", "seatTier": "none" }, "row2-col15": { "x": 47.5, "y": 6.8, "seatName": "AC-16", "seatTier": "none" }, "row2-col16": { "x": 50.6, "y": 6.8, "seatName": "AC-17", "seatTier": "none" }, "row2-col17": { "x": 53.7, "y": 6.8, "seatName": "AC-18", "seatTier": "none" }, "row2-col18": { "x": 56.8, "y": 6.8, "seatName": "AC-19", "seatTier": "none" }, "row2-col19": { "x": 59.900000000000006, "y": 6.8, "seatName": "AC-20", "seatTier": "none" }, "row2-col20": { "x": 63, "y": 6.8, "seatName": "AC-21", "seatTier": "none" }, "row2-col21": { "x": 66.1, "y": 6.8, "seatName": "AC-22", "seatTier": "none" }, "row2-col22": { "x": 69.2, "y": 6.8, "seatName": "AC-23", "seatTier": "none" }, "row2-col23": { "x": 72.3, "y": 6.8, "seatName": "AC-24", "seatTier": "none" }, "row2-col24": { "x": 75.4, "y": 6.8, "seatName": "AC-25", "seatTier": "none" }, "row2-col25": { "x": 78.5, "y": 6.8, "seatName": "AC-26", "seatTier": "none" }, "row2-col26": { "x": 81.6, "y": 6.8, "seatName": "AC-27", "seatTier": "none" }, "row2-col27": { "x": 84.7, "y": 6.8, "seatName": "AC-28", "seatTier": "none" }, "row2-col28": { "x": 87.80000000000001, "y": 6.8, "seatName": "AC-29", "seatTier": "none" }, "row2-col29": { "x": 90.9, "y": 6.8, "seatName": "AC-30", "seatTier": "none" }, "row2-col30": { "x": 94, "y": 6.8, "seatName": "AC-31", "seatTier": "none" }, "row2-col31": { "x": 97.1, "y": 6.8, "seatName": "AC-32", "seatTier": "none" }, "row2-col32": { "x": 100.2, "y": 6.8, "seatName": "AC-33", "seatTier": "none" }, "row2-col33": { "x": 103.30000000000001, "y": 6.8, "seatName": "AC-34", "seatTier": "none" }, "row2-col34": { "x": 106.4, "y": 6.8, "seatName": "AC-35", "seatTier": "none" }, "row2-col35": { "x": 109.5, "y": 6.8, "seatName": "AC-36", "seatTier": "none" }, "row2-col36": { "x": 112.6, "y": 6.8, "seatName": "AC-37", "seatTier": "none" }, "row2-col37": { "x": 115.7, "y": 6.8, "seatName": "AC-38", "seatTier": "none" }, "row2-col38": { "x": 118.80000000000001, "y": 6.8, "seatName": "AC-39", "seatTier": "none" }, "row2-col39": { "x": 121.9, "y": 6.8, "seatName": "AC-40", "seatTier": "none" }, "row2-col40": { "x": 125, "y": 6.8, "seatName": "AC-41", "seatTier": "none" }, "row2-col41": { "x": 128.1, "y": 6.8, "seatName": "AC-42", "seatTier": "none" }, "row2-col42": { "x": 131.2, "y": 6.8, "seatName": "AC-43", "seatTier": "none" }, "row2-col43": { "x": 134.3, "y": 6.8, "seatName": "AC-44", "seatTier": "none" }, "row2-col44": { "x": 137.4, "y": 6.8, "seatName": "AC-45", "seatTier": "none" }, "row2-col45": { "x": 140.5, "y": 6.8, "seatName": "AC-46", "seatTier": "none" }, "row2-col46": { "x": 143.6, "y": 6.8, "seatName": "AC-47", "seatTier": "none" }, "row2-col47": { "x": 146.7, "y": 6.8, "seatName": "AC-48", "seatTier": "none" }, "row2-col48": { "x": 149.8, "y": 6.8, "seatName": "AC-49", "seatTier": "none" }, "row2-col49": { "x": 152.9, "y": 6.8, "seatName": "AC-50", "seatTier": "none" }, "row3-col0": { "x": 1, "y": 9.7, "seatName": "AD-1", "seatTier": "none" }, "row3-col1": { "x": 4.1, "y": 9.7, "seatName": "AD-2", "seatTier": "none" }, "row3-col2": { "x": 7.2, "y": 9.7, "seatName": "AD-3", "seatTier": "none" }, "row3-col3": { "x": 10.3, "y": 9.7, "seatName": "AD-4", "seatTier": "none" }, "row3-col4": { "x": 13.4, "y": 9.7, "seatName": "AD-5", "seatTier": "none" }, "row3-col5": { "x": 16.5, "y": 9.7, "seatName": "AD-6", "seatTier": "none" }, "row3-col6": { "x": 19.6, "y": 9.7, "seatName": "AD-7", "seatTier": "none" }, "row3-col7": { "x": 22.700000000000003, "y": 9.7, "seatName": "AD-8", "seatTier": "none" }, "row3-col8": { "x": 25.8, "y": 9.7, "seatName": "AD-9", "seatTier": "none" }, "row3-col9": { "x": 28.9, "y": 9.7, "seatName": "AD-10", "seatTier": "none" }, "row3-col10": { "x": 32, "y": 9.7, "seatName": "AD-11", "seatTier": "none" }, "row3-col11": { "x": 35.1, "y": 9.7, "seatName": "AD-12", "seatTier": "none" }, "row3-col12": { "x": 38.2, "y": 9.7, "seatName": "AD-13", "seatTier": "none" }, "row3-col13": { "x": 41.3, "y": 9.7, "seatName": "AD-14", "seatTier": "none" }, "row3-col14": { "x": 44.400000000000006, "y": 9.7, "seatName": "AD-15", "seatTier": "none" }, "row3-col15": { "x": 47.5, "y": 9.7, "seatName": "AD-16", "seatTier": "none" }, "row3-col16": { "x": 50.6, "y": 9.7, "seatName": "AD-17", "seatTier": "none" }, "row3-col17": { "x": 53.7, "y": 9.7, "seatName": "AD-18", "seatTier": "none" }, "row3-col18": { "x": 56.8, "y": 9.7, "seatName": "AD-19", "seatTier": "none" }, "row3-col19": { "x": 59.900000000000006, "y": 9.7, "seatName": "AD-20", "seatTier": "none" }, "row3-col20": { "x": 63, "y": 9.7, "seatName": "AD-21", "seatTier": "none" }, "row3-col21": { "x": 66.1, "y": 9.7, "seatName": "AD-22", "seatTier": "none" }, "row3-col22": { "x": 69.2, "y": 9.7, "seatName": "AD-23", "seatTier": "none" }, "row3-col23": { "x": 72.3, "y": 9.7, "seatName": "AD-24", "seatTier": "none" }, "row3-col24": { "x": 75.4, "y": 9.7, "seatName": "AD-25", "seatTier": "none" }, "row3-col25": { "x": 78.5, "y": 9.7, "seatName": "AD-26", "seatTier": "none" }, "row3-col26": { "x": 81.6, "y": 9.7, "seatName": "AD-27", "seatTier": "none" }, "row3-col27": { "x": 84.7, "y": 9.7, "seatName": "AD-28", "seatTier": "none" }, "row3-col28": { "x": 87.80000000000001, "y": 9.7, "seatName": "AD-29", "seatTier": "none" }, "row3-col29": { "x": 90.9, "y": 9.7, "seatName": "AD-30", "seatTier": "none" }, "row3-col30": { "x": 94, "y": 9.7, "seatName": "AD-31", "seatTier": "none" }, "row3-col31": { "x": 97.1, "y": 9.7, "seatName": "AD-32", "seatTier": "none" }, "row3-col32": { "x": 100.2, "y": 9.7, "seatName": "AD-33", "seatTier": "none" }, "row3-col33": { "x": 103.30000000000001, "y": 9.7, "seatName": "AD-34", "seatTier": "none" }, "row3-col34": { "x": 106.4, "y": 9.7, "seatName": "AD-35", "seatTier": "none" }, "row3-col35": { "x": 109.5, "y": 9.7, "seatName": "AD-36", "seatTier": "none" }, "row3-col36": { "x": 112.6, "y": 9.7, "seatName": "AD-37", "seatTier": "none" }, "row3-col37": { "x": 115.7, "y": 9.7, "seatName": "AD-38", "seatTier": "none" }, "row3-col38": { "x": 118.80000000000001, "y": 9.7, "seatName": "AD-39", "seatTier": "none" }, "row3-col39": { "x": 121.9, "y": 9.7, "seatName": "AD-40", "seatTier": "none" }, "row3-col40": { "x": 125, "y": 9.7, "seatName": "AD-41", "seatTier": "none" }, "row3-col41": { "x": 128.1, "y": 9.7, "seatName": "AD-42", "seatTier": "none" }, "row3-col42": { "x": 131.2, "y": 9.7, "seatName": "AD-43", "seatTier": "none" }, "row3-col43": { "x": 134.3, "y": 9.7, "seatName": "AD-44", "seatTier": "none" }, "row3-col44": { "x": 137.4, "y": 9.7, "seatName": "AD-45", "seatTier": "none" }, "row3-col45": { "x": 140.5, "y": 9.7, "seatName": "AD-46", "seatTier": "none" }, "row3-col46": { "x": 143.6, "y": 9.7, "seatName": "AD-47", "seatTier": "none" }, "row3-col47": { "x": 146.7, "y": 9.7, "seatName": "AD-48", "seatTier": "none" }, "row3-col48": { "x": 149.8, "y": 9.7, "seatName": "AD-49", "seatTier": "none" }, "row3-col49": { "x": 152.9, "y": 9.7, "seatName": "AD-50", "seatTier": "none" }, "row4-col0": { "x": 1, "y": 12.6, "seatName": "AE-1", "seatTier": "none" }, "row4-col1": { "x": 4.1, "y": 12.6, "seatName": "AE-2", "seatTier": "none" }, "row4-col2": { "x": 7.2, "y": 12.6, "seatName": "AE-3", "seatTier": "none" }, "row4-col3": { "x": 10.3, "y": 12.6, "seatName": "AE-4", "seatTier": "none" }, "row4-col4": { "x": 13.4, "y": 12.6, "seatName": "AE-5", "seatTier": "none" }, "row4-col5": { "x": 16.5, "y": 12.6, "seatName": "AE-6", "seatTier": "none" }, "row4-col6": { "x": 19.6, "y": 12.6, "seatName": "AE-7", "seatTier": "none" }, "row4-col7": { "x": 22.700000000000003, "y": 12.6, "seatName": "AE-8", "seatTier": "none" }, "row4-col8": { "x": 25.8, "y": 12.6, "seatName": "AE-9", "seatTier": "none" }, "row4-col9": { "x": 28.9, "y": 12.6, "seatName": "AE-10", "seatTier": "none" }, "row4-col10": { "x": 32, "y": 12.6, "seatName": "AE-11", "seatTier": "none" }, "row4-col11": { "x": 35.1, "y": 12.6, "seatName": "AE-12", "seatTier": "none" }, "row4-col12": { "x": 38.2, "y": 12.6, "seatName": "AE-13", "seatTier": "none" }, "row4-col13": { "x": 41.3, "y": 12.6, "seatName": "AE-14", "seatTier": "none" }, "row4-col14": { "x": 44.400000000000006, "y": 12.6, "seatName": "AE-15", "seatTier": "none" }, "row4-col15": { "x": 47.5, "y": 12.6, "seatName": "AE-16", "seatTier": "none" }, "row4-col16": { "x": 50.6, "y": 12.6, "seatName": "AE-17", "seatTier": "none" }, "row4-col17": { "x": 53.7, "y": 12.6, "seatName": "AE-18", "seatTier": "none" }, "row4-col18": { "x": 56.8, "y": 12.6, "seatName": "AE-19", "seatTier": "none" }, "row4-col19": { "x": 59.900000000000006, "y": 12.6, "seatName": "AE-20", "seatTier": "none" }, "row4-col20": { "x": 63, "y": 12.6, "seatName": "AE-21", "seatTier": "none" }, "row4-col21": { "x": 66.1, "y": 12.6, "seatName": "AE-22", "seatTier": "none" }, "row4-col22": { "x": 69.2, "y": 12.6, "seatName": "AE-23", "seatTier": "none" }, "row4-col23": { "x": 72.3, "y": 12.6, "seatName": "AE-24", "seatTier": "none" }, "row4-col24": { "x": 75.4, "y": 12.6, "seatName": "AE-25", "seatTier": "none" }, "row4-col25": { "x": 78.5, "y": 12.6, "seatName": "AE-26", "seatTier": "none" }, "row4-col26": { "x": 81.6, "y": 12.6, "seatName": "AE-27", "seatTier": "none" }, "row4-col27": { "x": 84.7, "y": 12.6, "seatName": "AE-28", "seatTier": "none" }, "row4-col28": { "x": 87.80000000000001, "y": 12.6, "seatName": "AE-29", "seatTier": "none" }, "row4-col29": { "x": 90.9, "y": 12.6, "seatName": "AE-30", "seatTier": "none" }, "row4-col30": { "x": 94, "y": 12.6, "seatName": "AE-31", "seatTier": "none" }, "row4-col31": { "x": 97.1, "y": 12.6, "seatName": "AE-32", "seatTier": "none" }, "row4-col32": { "x": 100.2, "y": 12.6, "seatName": "AE-33", "seatTier": "none" }, "row4-col33": { "x": 103.30000000000001, "y": 12.6, "seatName": "AE-34", "seatTier": "none" }, "row4-col34": { "x": 106.4, "y": 12.6, "seatName": "AE-35", "seatTier": "none" }, "row4-col35": { "x": 109.5, "y": 12.6, "seatName": "AE-36", "seatTier": "none" }, "row4-col36": { "x": 112.6, "y": 12.6, "seatName": "AE-37", "seatTier": "none" }, "row4-col37": { "x": 115.7, "y": 12.6, "seatName": "AE-38", "seatTier": "none" }, "row4-col38": { "x": 118.80000000000001, "y": 12.6, "seatName": "AE-39", "seatTier": "none" }, "row4-col39": { "x": 121.9, "y": 12.6, "seatName": "AE-40", "seatTier": "none" }, "row4-col40": { "x": 125, "y": 12.6, "seatName": "AE-41", "seatTier": "none" }, "row4-col41": { "x": 128.1, "y": 12.6, "seatName": "AE-42", "seatTier": "none" }, "row4-col42": { "x": 131.2, "y": 12.6, "seatName": "AE-43", "seatTier": "none" }, "row4-col43": { "x": 134.3, "y": 12.6, "seatName": "AE-44", "seatTier": "none" }, "row4-col44": { "x": 137.4, "y": 12.6, "seatName": "AE-45", "seatTier": "none" }, "row4-col45": { "x": 140.5, "y": 12.6, "seatName": "AE-46", "seatTier": "none" }, "row4-col46": { "x": 143.6, "y": 12.6, "seatName": "AE-47", "seatTier": "none" }, "row4-col47": { "x": 146.7, "y": 12.6, "seatName": "AE-48", "seatTier": "none" }, "row4-col48": { "x": 149.8, "y": 12.6, "seatName": "AE-49", "seatTier": "none" }, "row4-col49": { "x": 152.9, "y": 12.6, "seatName": "AE-50", "seatTier": "none" }, "row5-col0": { "x": 1, "y": 15.5, "seatName": "AF-1", "seatTier": "none" }, "row5-col1": { "x": 4.1, "y": 15.5, "seatName": "AF-2", "seatTier": "none" }, "row5-col2": { "x": 7.2, "y": 15.5, "seatName": "AF-3", "seatTier": "none" }, "row5-col3": { "x": 10.3, "y": 15.5, "seatName": "AF-4", "seatTier": "none" }, "row5-col4": { "x": 13.4, "y": 15.5, "seatName": "AF-5", "seatTier": "none" }, "row5-col5": { "x": 16.5, "y": 15.5, "seatName": "AF-6", "seatTier": "none" }, "row5-col6": { "x": 19.6, "y": 15.5, "seatName": "AF-7", "seatTier": "none" }, "row5-col7": { "x": 22.700000000000003, "y": 15.5, "seatName": "AF-8", "seatTier": "none" }, "row5-col8": { "x": 25.8, "y": 15.5, "seatName": "AF-9", "seatTier": "none" }, "row5-col9": { "x": 28.9, "y": 15.5, "seatName": "AF-10", "seatTier": "none" }, "row5-col10": { "x": 32, "y": 15.5, "seatName": "AF-11", "seatTier": "none" }, "row5-col11": { "x": 35.1, "y": 15.5, "seatName": "AF-12", "seatTier": "none" }, "row5-col12": { "x": 38.2, "y": 15.5, "seatName": "AF-13", "seatTier": "none" }, "row5-col13": { "x": 41.3, "y": 15.5, "seatName": "AF-14", "seatTier": "none" }, "row5-col14": { "x": 44.400000000000006, "y": 15.5, "seatName": "AF-15", "seatTier": "none" }, "row5-col15": { "x": 47.5, "y": 15.5, "seatName": "AF-16", "seatTier": "none" }, "row5-col16": { "x": 50.6, "y": 15.5, "seatName": "AF-17", "seatTier": "none" }, "row5-col17": { "x": 53.7, "y": 15.5, "seatName": "AF-18", "seatTier": "none" }, "row5-col18": { "x": 56.8, "y": 15.5, "seatName": "AF-19", "seatTier": "none" }, "row5-col19": { "x": 59.900000000000006, "y": 15.5, "seatName": "AF-20", "seatTier": "none" }, "row5-col20": { "x": 63, "y": 15.5, "seatName": "AF-21", "seatTier": "none" }, "row5-col21": { "x": 66.1, "y": 15.5, "seatName": "AF-22", "seatTier": "none" }, "row5-col22": { "x": 69.2, "y": 15.5, "seatName": "AF-23", "seatTier": "none" }, "row5-col23": { "x": 72.3, "y": 15.5, "seatName": "AF-24", "seatTier": "none" }, "row5-col24": { "x": 75.4, "y": 15.5, "seatName": "AF-25", "seatTier": "none" }, "row5-col25": { "x": 78.5, "y": 15.5, "seatName": "AF-26", "seatTier": "none" }, "row5-col26": { "x": 81.6, "y": 15.5, "seatName": "AF-27", "seatTier": "none" }, "row5-col27": { "x": 84.7, "y": 15.5, "seatName": "AF-28", "seatTier": "none" }, "row5-col28": { "x": 87.80000000000001, "y": 15.5, "seatName": "AF-29", "seatTier": "none" }, "row5-col29": { "x": 90.9, "y": 15.5, "seatName": "AF-30", "seatTier": "none" }, "row5-col30": { "x": 94, "y": 15.5, "seatName": "AF-31", "seatTier": "none" }, "row5-col31": { "x": 97.1, "y": 15.5, "seatName": "AF-32", "seatTier": "none" }, "row5-col32": { "x": 100.2, "y": 15.5, "seatName": "AF-33", "seatTier": "none" }, "row5-col33": { "x": 103.30000000000001, "y": 15.5, "seatName": "AF-34", "seatTier": "none" }, "row5-col34": { "x": 106.4, "y": 15.5, "seatName": "AF-35", "seatTier": "none" }, "row5-col35": { "x": 109.5, "y": 15.5, "seatName": "AF-36", "seatTier": "none" }, "row5-col36": { "x": 112.6, "y": 15.5, "seatName": "AF-37", "seatTier": "none" }, "row5-col37": { "x": 115.7, "y": 15.5, "seatName": "AF-38", "seatTier": "none" }, "row5-col38": { "x": 118.80000000000001, "y": 15.5, "seatName": "AF-39", "seatTier": "none" }, "row5-col39": { "x": 121.9, "y": 15.5, "seatName": "AF-40", "seatTier": "none" }, "row5-col40": { "x": 125, "y": 15.5, "seatName": "AF-41", "seatTier": "none" }, "row5-col41": { "x": 128.1, "y": 15.5, "seatName": "AF-42", "seatTier": "none" }, "row5-col42": { "x": 131.2, "y": 15.5, "seatName": "AF-43", "seatTier": "none" }, "row5-col43": { "x": 134.3, "y": 15.5, "seatName": "AF-44", "seatTier": "none" }, "row5-col44": { "x": 137.4, "y": 15.5, "seatName": "AF-45", "seatTier": "none" }, "row5-col45": { "x": 140.5, "y": 15.5, "seatName": "AF-46", "seatTier": "none" }, "row5-col46": { "x": 143.6, "y": 15.5, "seatName": "AF-47", "seatTier": "none" }, "row5-col47": { "x": 146.7, "y": 15.5, "seatName": "AF-48", "seatTier": "none" }, "row5-col48": { "x": 149.8, "y": 15.5, "seatName": "AF-49", "seatTier": "none" }, "row5-col49": { "x": 152.9, "y": 15.5, "seatName": "AF-50", "seatTier": "none" }, "row6-col0": { "x": 1, "y": 18.4, "seatName": "AG-1", "seatTier": "none" }, "row6-col1": { "x": 4.1, "y": 18.4, "seatName": "AG-2", "seatTier": "none" }, "row6-col2": { "x": 7.2, "y": 18.4, "seatName": "AG-3", "seatTier": "none" }, "row6-col3": { "x": 10.3, "y": 18.4, "seatName": "AG-4", "seatTier": "none" }, "row6-col4": { "x": 13.4, "y": 18.4, "seatName": "AG-5", "seatTier": "none" }, "row6-col5": { "x": 16.5, "y": 18.4, "seatName": "AG-6", "seatTier": "none" }, "row6-col6": { "x": 19.6, "y": 18.4, "seatName": "AG-7", "seatTier": "none" }, "row6-col7": { "x": 22.700000000000003, "y": 18.4, "seatName": "AG-8", "seatTier": "none" }, "row6-col8": { "x": 25.8, "y": 18.4, "seatName": "AG-9", "seatTier": "none" }, "row6-col9": { "x": 28.9, "y": 18.4, "seatName": "AG-10", "seatTier": "none" }, "row6-col10": { "x": 32, "y": 18.4, "seatName": "AG-11", "seatTier": "none" }, "row6-col11": { "x": 35.1, "y": 18.4, "seatName": "AG-12", "seatTier": "none" }, "row6-col12": { "x": 38.2, "y": 18.4, "seatName": "AG-13", "seatTier": "none" }, "row6-col13": { "x": 41.3, "y": 18.4, "seatName": "AG-14", "seatTier": "none" }, "row6-col14": { "x": 44.400000000000006, "y": 18.4, "seatName": "AG-15", "seatTier": "none" }, "row6-col15": { "x": 47.5, "y": 18.4, "seatName": "AG-16", "seatTier": "none" }, "row6-col16": { "x": 50.6, "y": 18.4, "seatName": "AG-17", "seatTier": "none" }, "row6-col17": { "x": 53.7, "y": 18.4, "seatName": "AG-18", "seatTier": "none" }, "row6-col18": { "x": 56.8, "y": 18.4, "seatName": "AG-19", "seatTier": "none" }, "row6-col19": { "x": 59.900000000000006, "y": 18.4, "seatName": "AG-20", "seatTier": "none" }, "row6-col20": { "x": 63, "y": 18.4, "seatName": "AG-21", "seatTier": "none" }, "row6-col21": { "x": 66.1, "y": 18.4, "seatName": "AG-22", "seatTier": "none" }, "row6-col22": { "x": 69.2, "y": 18.4, "seatName": "AG-23", "seatTier": "none" }, "row6-col23": { "x": 72.3, "y": 18.4, "seatName": "AG-24", "seatTier": "none" }, "row6-col24": { "x": 75.4, "y": 18.4, "seatName": "AG-25", "seatTier": "none" }, "row6-col25": { "x": 78.5, "y": 18.4, "seatName": "AG-26", "seatTier": "none" }, "row6-col26": { "x": 81.6, "y": 18.4, "seatName": "AG-27", "seatTier": "none" }, "row6-col27": { "x": 84.7, "y": 18.4, "seatName": "AG-28", "seatTier": "none" }, "row6-col28": { "x": 87.80000000000001, "y": 18.4, "seatName": "AG-29", "seatTier": "none" }, "row6-col29": { "x": 90.9, "y": 18.4, "seatName": "AG-30", "seatTier": "none" }, "row6-col30": { "x": 94, "y": 18.4, "seatName": "AG-31", "seatTier": "none" }, "row6-col31": { "x": 97.1, "y": 18.4, "seatName": "AG-32", "seatTier": "none" }, "row6-col32": { "x": 100.2, "y": 18.4, "seatName": "AG-33", "seatTier": "none" }, "row6-col33": { "x": 103.30000000000001, "y": 18.4, "seatName": "AG-34", "seatTier": "none" }, "row6-col34": { "x": 106.4, "y": 18.4, "seatName": "AG-35", "seatTier": "none" }, "row6-col35": { "x": 109.5, "y": 18.4, "seatName": "AG-36", "seatTier": "none" }, "row6-col36": { "x": 112.6, "y": 18.4, "seatName": "AG-37", "seatTier": "none" }, "row6-col37": { "x": 115.7, "y": 18.4, "seatName": "AG-38", "seatTier": "none" }, "row6-col38": { "x": 118.80000000000001, "y": 18.4, "seatName": "AG-39", "seatTier": "none" }, "row6-col39": { "x": 121.9, "y": 18.4, "seatName": "AG-40", "seatTier": "none" }, "row6-col40": { "x": 125, "y": 18.4, "seatName": "AG-41", "seatTier": "none" }, "row6-col41": { "x": 128.1, "y": 18.4, "seatName": "AG-42", "seatTier": "none" }, "row6-col42": { "x": 131.2, "y": 18.4, "seatName": "AG-43", "seatTier": "none" }, "row6-col43": { "x": 134.3, "y": 18.4, "seatName": "AG-44", "seatTier": "none" }, "row6-col44": { "x": 137.4, "y": 18.4, "seatName": "AG-45", "seatTier": "none" }, "row6-col45": { "x": 140.5, "y": 18.4, "seatName": "AG-46", "seatTier": "none" }, "row6-col46": { "x": 143.6, "y": 18.4, "seatName": "AG-47", "seatTier": "none" }, "row6-col47": { "x": 146.7, "y": 18.4, "seatName": "AG-48", "seatTier": "none" }, "row6-col48": { "x": 149.8, "y": 18.4, "seatName": "AG-49", "seatTier": "none" }, "row6-col49": { "x": 152.9, "y": 18.4, "seatName": "AG-50", "seatTier": "none" }, "row7-col0": { "x": 1, "y": 21.3, "seatName": "AH-1", "seatTier": "none" }, "row7-col1": { "x": 4.1, "y": 21.3, "seatName": "AH-2", "seatTier": "none" }, "row7-col2": { "x": 7.2, "y": 21.3, "seatName": "AH-3", "seatTier": "none" }, "row7-col3": { "x": 10.3, "y": 21.3, "seatName": "AH-4", "seatTier": "none" }, "row7-col4": { "x": 13.4, "y": 21.3, "seatName": "AH-5", "seatTier": "none" }, "row7-col5": { "x": 16.5, "y": 21.3, "seatName": "AH-6", "seatTier": "none" }, "row7-col6": { "x": 19.6, "y": 21.3, "seatName": "AH-7", "seatTier": "none" }, "row7-col7": { "x": 22.700000000000003, "y": 21.3, "seatName": "AH-8", "seatTier": "none" }, "row7-col8": { "x": 25.8, "y": 21.3, "seatName": "AH-9", "seatTier": "none" }, "row7-col9": { "x": 28.9, "y": 21.3, "seatName": "AH-10", "seatTier": "none" }, "row7-col10": { "x": 32, "y": 21.3, "seatName": "AH-11", "seatTier": "none" }, "row7-col11": { "x": 35.1, "y": 21.3, "seatName": "AH-12", "seatTier": "none" }, "row7-col12": { "x": 38.2, "y": 21.3, "seatName": "AH-13", "seatTier": "none" }, "row7-col13": { "x": 41.3, "y": 21.3, "seatName": "AH-14", "seatTier": "none" }, "row7-col14": { "x": 44.400000000000006, "y": 21.3, "seatName": "AH-15", "seatTier": "none" }, "row7-col15": { "x": 47.5, "y": 21.3, "seatName": "AH-16", "seatTier": "none" }, "row7-col16": { "x": 50.6, "y": 21.3, "seatName": "AH-17", "seatTier": "none" }, "row7-col17": { "x": 53.7, "y": 21.3, "seatName": "AH-18", "seatTier": "none" }, "row7-col18": { "x": 56.8, "y": 21.3, "seatName": "AH-19", "seatTier": "none" }, "row7-col19": { "x": 59.900000000000006, "y": 21.3, "seatName": "AH-20", "seatTier": "none" }, "row7-col20": { "x": 63, "y": 21.3, "seatName": "AH-21", "seatTier": "none" }, "row7-col21": { "x": 66.1, "y": 21.3, "seatName": "AH-22", "seatTier": "none" }, "row7-col22": { "x": 69.2, "y": 21.3, "seatName": "AH-23", "seatTier": "none" }, "row7-col23": { "x": 72.3, "y": 21.3, "seatName": "AH-24", "seatTier": "none" }, "row7-col24": { "x": 75.4, "y": 21.3, "seatName": "AH-25", "seatTier": "none" }, "row7-col25": { "x": 78.5, "y": 21.3, "seatName": "AH-26", "seatTier": "none" }, "row7-col26": { "x": 81.6, "y": 21.3, "seatName": "AH-27", "seatTier": "none" }, "row7-col27": { "x": 84.7, "y": 21.3, "seatName": "AH-28", "seatTier": "none" }, "row7-col28": { "x": 87.80000000000001, "y": 21.3, "seatName": "AH-29", "seatTier": "none" }, "row7-col29": { "x": 90.9, "y": 21.3, "seatName": "AH-30", "seatTier": "none" }, "row7-col30": { "x": 94, "y": 21.3, "seatName": "AH-31", "seatTier": "none" }, "row7-col31": { "x": 97.1, "y": 21.3, "seatName": "AH-32", "seatTier": "none" }, "row7-col32": { "x": 100.2, "y": 21.3, "seatName": "AH-33", "seatTier": "none" }, "row7-col33": { "x": 103.30000000000001, "y": 21.3, "seatName": "AH-34", "seatTier": "none" }, "row7-col34": { "x": 106.4, "y": 21.3, "seatName": "AH-35", "seatTier": "none" }, "row7-col35": { "x": 109.5, "y": 21.3, "seatName": "AH-36", "seatTier": "none" }, "row7-col36": { "x": 112.6, "y": 21.3, "seatName": "AH-37", "seatTier": "none" }, "row7-col37": { "x": 115.7, "y": 21.3, "seatName": "AH-38", "seatTier": "none" }, "row7-col38": { "x": 118.80000000000001, "y": 21.3, "seatName": "AH-39", "seatTier": "none" }, "row7-col39": { "x": 121.9, "y": 21.3, "seatName": "AH-40", "seatTier": "none" }, "row7-col40": { "x": 125, "y": 21.3, "seatName": "AH-41", "seatTier": "none" }, "row7-col41": { "x": 128.1, "y": 21.3, "seatName": "AH-42", "seatTier": "none" }, "row7-col42": { "x": 131.2, "y": 21.3, "seatName": "AH-43", "seatTier": "none" }, "row7-col43": { "x": 134.3, "y": 21.3, "seatName": "AH-44", "seatTier": "none" }, "row7-col44": { "x": 137.4, "y": 21.3, "seatName": "AH-45", "seatTier": "none" }, "row7-col45": { "x": 140.5, "y": 21.3, "seatName": "AH-46", "seatTier": "none" }, "row7-col46": { "x": 143.6, "y": 21.3, "seatName": "AH-47", "seatTier": "none" }, "row7-col47": { "x": 146.7, "y": 21.3, "seatName": "AH-48", "seatTier": "none" }, "row7-col48": { "x": 149.8, "y": 21.3, "seatName": "AH-49", "seatTier": "none" }, "row7-col49": { "x": 152.9, "y": 21.3, "seatName": "AH-50", "seatTier": "none" }, "row8-col0": { "x": 1, "y": 24.2, "seatName": "AI-1", "seatTier": "none" }, "row8-col1": { "x": 4.1, "y": 24.2, "seatName": "AI-2", "seatTier": "none" }, "row8-col2": { "x": 7.2, "y": 24.2, "seatName": "AI-3", "seatTier": "none" }, "row8-col3": { "x": 10.3, "y": 24.2, "seatName": "AI-4", "seatTier": "none" }, "row8-col4": { "x": 13.4, "y": 24.2, "seatName": "AI-5", "seatTier": "none" }, "row8-col5": { "x": 16.5, "y": 24.2, "seatName": "AI-6", "seatTier": "none" }, "row8-col6": { "x": 19.6, "y": 24.2, "seatName": "AI-7", "seatTier": "none" }, "row8-col7": { "x": 22.700000000000003, "y": 24.2, "seatName": "AI-8", "seatTier": "none" }, "row8-col8": { "x": 25.8, "y": 24.2, "seatName": "AI-9", "seatTier": "none" }, "row8-col9": { "x": 28.9, "y": 24.2, "seatName": "AI-10", "seatTier": "none" }, "row8-col10": { "x": 32, "y": 24.2, "seatName": "AI-11", "seatTier": "none" }, "row8-col11": { "x": 35.1, "y": 24.2, "seatName": "AI-12", "seatTier": "none" }, "row8-col12": { "x": 38.2, "y": 24.2, "seatName": "AI-13", "seatTier": "none" }, "row8-col13": { "x": 41.3, "y": 24.2, "seatName": "AI-14", "seatTier": "none" }, "row8-col14": { "x": 44.400000000000006, "y": 24.2, "seatName": "AI-15", "seatTier": "none" }, "row8-col15": { "x": 47.5, "y": 24.2, "seatName": "AI-16", "seatTier": "none" }, "row8-col16": { "x": 50.6, "y": 24.2, "seatName": "AI-17", "seatTier": "none" }, "row8-col17": { "x": 53.7, "y": 24.2, "seatName": "AI-18", "seatTier": "none" }, "row8-col18": { "x": 56.8, "y": 24.2, "seatName": "AI-19", "seatTier": "none" }, "row8-col19": { "x": 59.900000000000006, "y": 24.2, "seatName": "AI-20", "seatTier": "none" }, "row8-col20": { "x": 63, "y": 24.2, "seatName": "AI-21", "seatTier": "none" }, "row8-col21": { "x": 66.1, "y": 24.2, "seatName": "AI-22", "seatTier": "none" }, "row8-col22": { "x": 69.2, "y": 24.2, "seatName": "AI-23", "seatTier": "none" }, "row8-col23": { "x": 72.3, "y": 24.2, "seatName": "AI-24", "seatTier": "none" }, "row8-col24": { "x": 75.4, "y": 24.2, "seatName": "AI-25", "seatTier": "none" }, "row8-col25": { "x": 78.5, "y": 24.2, "seatName": "AI-26", "seatTier": "none" }, "row8-col26": { "x": 81.6, "y": 24.2, "seatName": "AI-27", "seatTier": "none" }, "row8-col27": { "x": 84.7, "y": 24.2, "seatName": "AI-28", "seatTier": "none" }, "row8-col28": { "x": 87.80000000000001, "y": 24.2, "seatName": "AI-29", "seatTier": "none" }, "row8-col29": { "x": 90.9, "y": 24.2, "seatName": "AI-30", "seatTier": "none" }, "row8-col30": { "x": 94, "y": 24.2, "seatName": "AI-31", "seatTier": "none" }, "row8-col31": { "x": 97.1, "y": 24.2, "seatName": "AI-32", "seatTier": "none" }, "row8-col32": { "x": 100.2, "y": 24.2, "seatName": "AI-33", "seatTier": "none" }, "row8-col33": { "x": 103.30000000000001, "y": 24.2, "seatName": "AI-34", "seatTier": "none" }, "row8-col34": { "x": 106.4, "y": 24.2, "seatName": "AI-35", "seatTier": "none" }, "row8-col35": { "x": 109.5, "y": 24.2, "seatName": "AI-36", "seatTier": "none" }, "row8-col36": { "x": 112.6, "y": 24.2, "seatName": "AI-37", "seatTier": "none" }, "row8-col37": { "x": 115.7, "y": 24.2, "seatName": "AI-38", "seatTier": "none" }, "row8-col38": { "x": 118.80000000000001, "y": 24.2, "seatName": "AI-39", "seatTier": "none" }, "row8-col39": { "x": 121.9, "y": 24.2, "seatName": "AI-40", "seatTier": "none" }, "row8-col40": { "x": 125, "y": 24.2, "seatName": "AI-41", "seatTier": "none" }, "row8-col41": { "x": 128.1, "y": 24.2, "seatName": "AI-42", "seatTier": "none" }, "row8-col42": { "x": 131.2, "y": 24.2, "seatName": "AI-43", "seatTier": "none" }, "row8-col43": { "x": 134.3, "y": 24.2, "seatName": "AI-44", "seatTier": "none" }, "row8-col44": { "x": 137.4, "y": 24.2, "seatName": "AI-45", "seatTier": "none" }, "row8-col45": { "x": 140.5, "y": 24.2, "seatName": "AI-46", "seatTier": "none" }, "row8-col46": { "x": 143.6, "y": 24.2, "seatName": "AI-47", "seatTier": "none" }, "row8-col47": { "x": 146.7, "y": 24.2, "seatName": "AI-48", "seatTier": "none" }, "row8-col48": { "x": 149.8, "y": 24.2, "seatName": "AI-49", "seatTier": "none" }, "row8-col49": { "x": 152.9, "y": 24.2, "seatName": "AI-50", "seatTier": "none" }, "row9-col0": { "x": 1, "y": 27.1, "seatName": "AJ-1", "seatTier": "none" }, "row9-col1": { "x": 4.1, "y": 27.1, "seatName": "AJ-2", "seatTier": "none" }, "row9-col2": { "x": 7.2, "y": 27.1, "seatName": "AJ-3", "seatTier": "none" }, "row9-col3": { "x": 10.3, "y": 27.1, "seatName": "AJ-4", "seatTier": "none" }, "row9-col4": { "x": 13.4, "y": 27.1, "seatName": "AJ-5", "seatTier": "none" }, "row9-col5": { "x": 16.5, "y": 27.1, "seatName": "AJ-6", "seatTier": "none" }, "row9-col6": { "x": 19.6, "y": 27.1, "seatName": "AJ-7", "seatTier": "none" }, "row9-col7": { "x": 22.700000000000003, "y": 27.1, "seatName": "AJ-8", "seatTier": "none" }, "row9-col8": { "x": 25.8, "y": 27.1, "seatName": "AJ-9", "seatTier": "none" }, "row9-col9": { "x": 28.9, "y": 27.1, "seatName": "AJ-10", "seatTier": "none" }, "row9-col10": { "x": 32, "y": 27.1, "seatName": "AJ-11", "seatTier": "none" }, "row9-col11": { "x": 35.1, "y": 27.1, "seatName": "AJ-12", "seatTier": "none" }, "row9-col12": { "x": 38.2, "y": 27.1, "seatName": "AJ-13", "seatTier": "none" }, "row9-col13": { "x": 41.3, "y": 27.1, "seatName": "AJ-14", "seatTier": "none" }, "row9-col14": { "x": 44.400000000000006, "y": 27.1, "seatName": "AJ-15", "seatTier": "none" }, "row9-col15": { "x": 47.5, "y": 27.1, "seatName": "AJ-16", "seatTier": "none" }, "row9-col16": { "x": 50.6, "y": 27.1, "seatName": "AJ-17", "seatTier": "none" }, "row9-col17": { "x": 53.7, "y": 27.1, "seatName": "AJ-18", "seatTier": "none" }, "row9-col18": { "x": 56.8, "y": 27.1, "seatName": "AJ-19", "seatTier": "none" }, "row9-col19": { "x": 59.900000000000006, "y": 27.1, "seatName": "AJ-20", "seatTier": "none" }, "row9-col20": { "x": 63, "y": 27.1, "seatName": "AJ-21", "seatTier": "none" }, "row9-col21": { "x": 66.1, "y": 27.1, "seatName": "AJ-22", "seatTier": "none" }, "row9-col22": { "x": 69.2, "y": 27.1, "seatName": "AJ-23", "seatTier": "none" }, "row9-col23": { "x": 72.3, "y": 27.1, "seatName": "AJ-24", "seatTier": "none" }, "row9-col24": { "x": 75.4, "y": 27.1, "seatName": "AJ-25", "seatTier": "none" }, "row9-col25": { "x": 78.5, "y": 27.1, "seatName": "AJ-26", "seatTier": "none" }, "row9-col26": { "x": 81.6, "y": 27.1, "seatName": "AJ-27", "seatTier": "none" }, "row9-col27": { "x": 84.7, "y": 27.1, "seatName": "AJ-28", "seatTier": "none" }, "row9-col28": { "x": 87.80000000000001, "y": 27.1, "seatName": "AJ-29", "seatTier": "none" }, "row9-col29": { "x": 90.9, "y": 27.1, "seatName": "AJ-30", "seatTier": "none" }, "row9-col30": { "x": 94, "y": 27.1, "seatName": "AJ-31", "seatTier": "none" }, "row9-col31": { "x": 97.1, "y": 27.1, "seatName": "AJ-32", "seatTier": "none" }, "row9-col32": { "x": 100.2, "y": 27.1, "seatName": "AJ-33", "seatTier": "none" }, "row9-col33": { "x": 103.30000000000001, "y": 27.1, "seatName": "AJ-34", "seatTier": "none" }, "row9-col34": { "x": 106.4, "y": 27.1, "seatName": "AJ-35", "seatTier": "none" }, "row9-col35": { "x": 109.5, "y": 27.1, "seatName": "AJ-36", "seatTier": "none" }, "row9-col36": { "x": 112.6, "y": 27.1, "seatName": "AJ-37", "seatTier": "none" }, "row9-col37": { "x": 115.7, "y": 27.1, "seatName": "AJ-38", "seatTier": "none" }, "row9-col38": { "x": 118.80000000000001, "y": 27.1, "seatName": "AJ-39", "seatTier": "none" }, "row9-col39": { "x": 121.9, "y": 27.1, "seatName": "AJ-40", "seatTier": "none" }, "row9-col40": { "x": 125, "y": 27.1, "seatName": "AJ-41", "seatTier": "none" }, "row9-col41": { "x": 128.1, "y": 27.1, "seatName": "AJ-42", "seatTier": "none" }, "row9-col42": { "x": 131.2, "y": 27.1, "seatName": "AJ-43", "seatTier": "none" }, "row9-col43": { "x": 134.3, "y": 27.1, "seatName": "AJ-44", "seatTier": "none" }, "row9-col44": { "x": 137.4, "y": 27.1, "seatName": "AJ-45", "seatTier": "none" }, "row9-col45": { "x": 140.5, "y": 27.1, "seatName": "AJ-46", "seatTier": "none" }, "row9-col46": { "x": 143.6, "y": 27.1, "seatName": "AJ-47", "seatTier": "none" }, "row9-col47": { "x": 146.7, "y": 27.1, "seatName": "AJ-48", "seatTier": "none" }, "row9-col48": { "x": 149.8, "y": 27.1, "seatName": "AJ-49", "seatTier": "none" }, "row9-col49": { "x": 152.9, "y": 27.1, "seatName": "AJ-50", "seatTier": "none" }, "row10-col0": { "x": 1, "y": 30, "seatName": "AK-1", "seatTier": "none" }, "row10-col1": { "x": 4.1, "y": 30, "seatName": "AK-2", "seatTier": "none" }, "row10-col2": { "x": 7.2, "y": 30, "seatName": "AK-3", "seatTier": "none" }, "row10-col3": { "x": 10.3, "y": 30, "seatName": "AK-4", "seatTier": "none" }, "row10-col4": { "x": 13.4, "y": 30, "seatName": "AK-5", "seatTier": "none" }, "row10-col5": { "x": 16.5, "y": 30, "seatName": "AK-6", "seatTier": "none" }, "row10-col6": { "x": 19.6, "y": 30, "seatName": "AK-7", "seatTier": "none" }, "row10-col7": { "x": 22.700000000000003, "y": 30, "seatName": "AK-8", "seatTier": "none" }, "row10-col8": { "x": 25.8, "y": 30, "seatName": "AK-9", "seatTier": "none" }, "row10-col9": { "x": 28.9, "y": 30, "seatName": "AK-10", "seatTier": "none" }, "row10-col10": { "x": 32, "y": 30, "seatName": "AK-11", "seatTier": "none" }, "row10-col11": { "x": 35.1, "y": 30, "seatName": "AK-12", "seatTier": "none" }, "row10-col12": { "x": 38.2, "y": 30, "seatName": "AK-13", "seatTier": "none" }, "row10-col13": { "x": 41.3, "y": 30, "seatName": "AK-14", "seatTier": "none" }, "row10-col14": { "x": 44.400000000000006, "y": 30, "seatName": "AK-15", "seatTier": "none" }, "row10-col15": { "x": 47.5, "y": 30, "seatName": "AK-16", "seatTier": "none" }, "row10-col16": { "x": 50.6, "y": 30, "seatName": "AK-17", "seatTier": "none" }, "row10-col17": { "x": 53.7, "y": 30, "seatName": "AK-18", "seatTier": "none" }, "row10-col18": { "x": 56.8, "y": 30, "seatName": "AK-19", "seatTier": "none" }, "row10-col19": { "x": 59.900000000000006, "y": 30, "seatName": "AK-20", "seatTier": "none" }, "row10-col20": { "x": 63, "y": 30, "seatName": "AK-21", "seatTier": "none" }, "row10-col21": { "x": 66.1, "y": 30, "seatName": "AK-22", "seatTier": "none" }, "row10-col22": { "x": 69.2, "y": 30, "seatName": "AK-23", "seatTier": "none" }, "row10-col23": { "x": 72.3, "y": 30, "seatName": "AK-24", "seatTier": "none" }, "row10-col24": { "x": 75.4, "y": 30, "seatName": "AK-25", "seatTier": "none" }, "row10-col25": { "x": 78.5, "y": 30, "seatName": "AK-26", "seatTier": "none" }, "row10-col26": { "x": 81.6, "y": 30, "seatName": "AK-27", "seatTier": "none" }, "row10-col27": { "x": 84.7, "y": 30, "seatName": "AK-28", "seatTier": "none" }, "row10-col28": { "x": 87.80000000000001, "y": 30, "seatName": "AK-29", "seatTier": "none" }, "row10-col29": { "x": 90.9, "y": 30, "seatName": "AK-30", "seatTier": "none" }, "row10-col30": { "x": 94, "y": 30, "seatName": "AK-31", "seatTier": "none" }, "row10-col31": { "x": 97.1, "y": 30, "seatName": "AK-32", "seatTier": "none" }, "row10-col32": { "x": 100.2, "y": 30, "seatName": "AK-33", "seatTier": "none" }, "row10-col33": { "x": 103.30000000000001, "y": 30, "seatName": "AK-34", "seatTier": "none" }, "row10-col34": { "x": 106.4, "y": 30, "seatName": "AK-35", "seatTier": "none" }, "row10-col35": { "x": 109.5, "y": 30, "seatName": "AK-36", "seatTier": "none" }, "row10-col36": { "x": 112.6, "y": 30, "seatName": "AK-37", "seatTier": "none" }, "row10-col37": { "x": 115.7, "y": 30, "seatName": "AK-38", "seatTier": "none" }, "row10-col38": { "x": 118.80000000000001, "y": 30, "seatName": "AK-39", "seatTier": "none" }, "row10-col39": { "x": 121.9, "y": 30, "seatName": "AK-40", "seatTier": "none" }, "row10-col40": { "x": 125, "y": 30, "seatName": "AK-41", "seatTier": "none" }, "row10-col41": { "x": 128.1, "y": 30, "seatName": "AK-42", "seatTier": "none" }, "row10-col42": { "x": 131.2, "y": 30, "seatName": "AK-43", "seatTier": "none" }, "row10-col43": { "x": 134.3, "y": 30, "seatName": "AK-44", "seatTier": "none" }, "row10-col44": { "x": 137.4, "y": 30, "seatName": "AK-45", "seatTier": "none" }, "row10-col45": { "x": 140.5, "y": 30, "seatName": "AK-46", "seatTier": "none" }, "row10-col46": { "x": 143.6, "y": 30, "seatName": "AK-47", "seatTier": "none" }, "row10-col47": { "x": 146.7, "y": 30, "seatName": "AK-48", "seatTier": "none" }, "row10-col48": { "x": 149.8, "y": 30, "seatName": "AK-49", "seatTier": "none" }, "row10-col49": { "x": 152.9, "y": 30, "seatName": "AK-50", "seatTier": "none" }, "row11-col0": { "x": 1, "y": 32.9, "seatName": "AL-1", "seatTier": "none" }, "row11-col1": { "x": 4.1, "y": 32.9, "seatName": "AL-2", "seatTier": "none" }, "row11-col2": { "x": 7.2, "y": 32.9, "seatName": "AL-3", "seatTier": "none" }, "row11-col3": { "x": 10.3, "y": 32.9, "seatName": "AL-4", "seatTier": "none" }, "row11-col4": { "x": 13.4, "y": 32.9, "seatName": "AL-5", "seatTier": "none" }, "row11-col5": { "x": 16.5, "y": 32.9, "seatName": "AL-6", "seatTier": "none" }, "row11-col6": { "x": 19.6, "y": 32.9, "seatName": "AL-7", "seatTier": "none" }, "row11-col7": { "x": 22.700000000000003, "y": 32.9, "seatName": "AL-8", "seatTier": "none" }, "row11-col8": { "x": 25.8, "y": 32.9, "seatName": "AL-9", "seatTier": "none" }, "row11-col9": { "x": 28.9, "y": 32.9, "seatName": "AL-10", "seatTier": "none" }, "row11-col10": { "x": 32, "y": 32.9, "seatName": "AL-11", "seatTier": "none" }, "row11-col11": { "x": 35.1, "y": 32.9, "seatName": "AL-12", "seatTier": "none" }, "row11-col12": { "x": 38.2, "y": 32.9, "seatName": "AL-13", "seatTier": "none" }, "row11-col13": { "x": 41.3, "y": 32.9, "seatName": "AL-14", "seatTier": "none" }, "row11-col14": { "x": 44.400000000000006, "y": 32.9, "seatName": "AL-15", "seatTier": "none" }, "row11-col15": { "x": 47.5, "y": 32.9, "seatName": "AL-16", "seatTier": "none" }, "row11-col16": { "x": 50.6, "y": 32.9, "seatName": "AL-17", "seatTier": "none" }, "row11-col17": { "x": 53.7, "y": 32.9, "seatName": "AL-18", "seatTier": "none" }, "row11-col18": { "x": 56.8, "y": 32.9, "seatName": "AL-19", "seatTier": "none" }, "row11-col19": { "x": 59.900000000000006, "y": 32.9, "seatName": "AL-20", "seatTier": "none" }, "row11-col20": { "x": 63, "y": 32.9, "seatName": "AL-21", "seatTier": "none" }, "row11-col21": { "x": 66.1, "y": 32.9, "seatName": "AL-22", "seatTier": "none" }, "row11-col22": { "x": 69.2, "y": 32.9, "seatName": "AL-23", "seatTier": "none" }, "row11-col23": { "x": 72.3, "y": 32.9, "seatName": "AL-24", "seatTier": "none" }, "row11-col24": { "x": 75.4, "y": 32.9, "seatName": "AL-25", "seatTier": "none" }, "row11-col25": { "x": 78.5, "y": 32.9, "seatName": "AL-26", "seatTier": "none" }, "row11-col26": { "x": 81.6, "y": 32.9, "seatName": "AL-27", "seatTier": "none" }, "row11-col27": { "x": 84.7, "y": 32.9, "seatName": "AL-28", "seatTier": "none" }, "row11-col28": { "x": 87.80000000000001, "y": 32.9, "seatName": "AL-29", "seatTier": "none" }, "row11-col29": { "x": 90.9, "y": 32.9, "seatName": "AL-30", "seatTier": "none" }, "row11-col30": { "x": 94, "y": 32.9, "seatName": "AL-31", "seatTier": "none" }, "row11-col31": { "x": 97.1, "y": 32.9, "seatName": "AL-32", "seatTier": "none" }, "row11-col32": { "x": 100.2, "y": 32.9, "seatName": "AL-33", "seatTier": "none" }, "row11-col33": { "x": 103.30000000000001, "y": 32.9, "seatName": "AL-34", "seatTier": "none" }, "row11-col34": { "x": 106.4, "y": 32.9, "seatName": "AL-35", "seatTier": "none" }, "row11-col35": { "x": 109.5, "y": 32.9, "seatName": "AL-36", "seatTier": "none" }, "row11-col36": { "x": 112.6, "y": 32.9, "seatName": "AL-37", "seatTier": "none" }, "row11-col37": { "x": 115.7, "y": 32.9, "seatName": "AL-38", "seatTier": "none" }, "row11-col38": { "x": 118.80000000000001, "y": 32.9, "seatName": "AL-39", "seatTier": "none" }, "row11-col39": { "x": 121.9, "y": 32.9, "seatName": "AL-40", "seatTier": "none" }, "row11-col40": { "x": 125, "y": 32.9, "seatName": "AL-41", "seatTier": "none" }, "row11-col41": { "x": 128.1, "y": 32.9, "seatName": "AL-42", "seatTier": "none" }, "row11-col42": { "x": 131.2, "y": 32.9, "seatName": "AL-43", "seatTier": "none" }, "row11-col43": { "x": 134.3, "y": 32.9, "seatName": "AL-44", "seatTier": "none" }, "row11-col44": { "x": 137.4, "y": 32.9, "seatName": "AL-45", "seatTier": "none" }, "row11-col45": { "x": 140.5, "y": 32.9, "seatName": "AL-46", "seatTier": "none" }, "row11-col46": { "x": 143.6, "y": 32.9, "seatName": "AL-47", "seatTier": "none" }, "row11-col47": { "x": 146.7, "y": 32.9, "seatName": "AL-48", "seatTier": "none" }, "row11-col48": { "x": 149.8, "y": 32.9, "seatName": "AL-49", "seatTier": "none" }, "row11-col49": { "x": 152.9, "y": 32.9, "seatName": "AL-50", "seatTier": "none" }, "row12-col0": { "x": 1, "y": 35.8, "seatName": "AM-1", "seatTier": "none" }, "row12-col1": { "x": 4.1, "y": 35.8, "seatName": "AM-2", "seatTier": "none" }, "row12-col2": { "x": 7.2, "y": 35.8, "seatName": "AM-3", "seatTier": "none" }, "row12-col3": { "x": 10.3, "y": 35.8, "seatName": "AM-4", "seatTier": "none" }, "row12-col4": { "x": 13.4, "y": 35.8, "seatName": "AM-5", "seatTier": "none" }, "row12-col5": { "x": 16.5, "y": 35.8, "seatName": "AM-6", "seatTier": "none" }, "row12-col6": { "x": 19.6, "y": 35.8, "seatName": "AM-7", "seatTier": "none" }, "row12-col7": { "x": 22.700000000000003, "y": 35.8, "seatName": "AM-8", "seatTier": "none" }, "row12-col8": { "x": 25.8, "y": 35.8, "seatName": "AM-9", "seatTier": "none" }, "row12-col9": { "x": 28.9, "y": 35.8, "seatName": "AM-10", "seatTier": "none" }, "row12-col10": { "x": 32, "y": 35.8, "seatName": "AM-11", "seatTier": "none" }, "row12-col11": { "x": 35.1, "y": 35.8, "seatName": "AM-12", "seatTier": "none" }, "row12-col12": { "x": 38.2, "y": 35.8, "seatName": "AM-13", "seatTier": "none" }, "row12-col13": { "x": 41.3, "y": 35.8, "seatName": "AM-14", "seatTier": "none" }, "row12-col14": { "x": 44.400000000000006, "y": 35.8, "seatName": "AM-15", "seatTier": "none" }, "row12-col15": { "x": 47.5, "y": 35.8, "seatName": "AM-16", "seatTier": "none" }, "row12-col16": { "x": 50.6, "y": 35.8, "seatName": "AM-17", "seatTier": "none" }, "row12-col17": { "x": 53.7, "y": 35.8, "seatName": "AM-18", "seatTier": "none" }, "row12-col18": { "x": 56.8, "y": 35.8, "seatName": "AM-19", "seatTier": "none" }, "row12-col19": { "x": 59.900000000000006, "y": 35.8, "seatName": "AM-20", "seatTier": "none" }, "row12-col20": { "x": 63, "y": 35.8, "seatName": "AM-21", "seatTier": "none" }, "row12-col21": { "x": 66.1, "y": 35.8, "seatName": "AM-22", "seatTier": "none" }, "row12-col22": { "x": 69.2, "y": 35.8, "seatName": "AM-23", "seatTier": "none" }, "row12-col23": { "x": 72.3, "y": 35.8, "seatName": "AM-24", "seatTier": "none" }, "row12-col24": { "x": 75.4, "y": 35.8, "seatName": "AM-25", "seatTier": "none" }, "row12-col25": { "x": 78.5, "y": 35.8, "seatName": "AM-26", "seatTier": "none" }, "row12-col26": { "x": 81.6, "y": 35.8, "seatName": "AM-27", "seatTier": "none" }, "row12-col27": { "x": 84.7, "y": 35.8, "seatName": "AM-28", "seatTier": "none" }, "row12-col28": { "x": 87.80000000000001, "y": 35.8, "seatName": "AM-29", "seatTier": "none" }, "row12-col29": { "x": 90.9, "y": 35.8, "seatName": "AM-30", "seatTier": "none" }, "row12-col30": { "x": 94, "y": 35.8, "seatName": "AM-31", "seatTier": "none" }, "row12-col31": { "x": 97.1, "y": 35.8, "seatName": "AM-32", "seatTier": "none" }, "row12-col32": { "x": 100.2, "y": 35.8, "seatName": "AM-33", "seatTier": "none" }, "row12-col33": { "x": 103.30000000000001, "y": 35.8, "seatName": "AM-34", "seatTier": "none" }, "row12-col34": { "x": 106.4, "y": 35.8, "seatName": "AM-35", "seatTier": "none" }, "row12-col35": { "x": 109.5, "y": 35.8, "seatName": "AM-36", "seatTier": "none" }, "row12-col36": { "x": 112.6, "y": 35.8, "seatName": "AM-37", "seatTier": "none" }, "row12-col37": { "x": 115.7, "y": 35.8, "seatName": "AM-38", "seatTier": "none" }, "row12-col38": { "x": 118.80000000000001, "y": 35.8, "seatName": "AM-39", "seatTier": "none" }, "row12-col39": { "x": 121.9, "y": 35.8, "seatName": "AM-40", "seatTier": "none" }, "row12-col40": { "x": 125, "y": 35.8, "seatName": "AM-41", "seatTier": "none" }, "row12-col41": { "x": 128.1, "y": 35.8, "seatName": "AM-42", "seatTier": "none" }, "row12-col42": { "x": 131.2, "y": 35.8, "seatName": "AM-43", "seatTier": "none" }, "row12-col43": { "x": 134.3, "y": 35.8, "seatName": "AM-44", "seatTier": "none" }, "row12-col44": { "x": 137.4, "y": 35.8, "seatName": "AM-45", "seatTier": "none" }, "row12-col45": { "x": 140.5, "y": 35.8, "seatName": "AM-46", "seatTier": "none" }, "row12-col46": { "x": 143.6, "y": 35.8, "seatName": "AM-47", "seatTier": "none" }, "row12-col47": { "x": 146.7, "y": 35.8, "seatName": "AM-48", "seatTier": "none" }, "row12-col48": { "x": 149.8, "y": 35.8, "seatName": "AM-49", "seatTier": "none" }, "row12-col49": { "x": 152.9, "y": 35.8, "seatName": "AM-50", "seatTier": "none" }, "row13-col0": { "x": 1, "y": 38.7, "seatName": "AN-1", "seatTier": "none" }, "row13-col1": { "x": 4.1, "y": 38.7, "seatName": "AN-2", "seatTier": "none" }, "row13-col2": { "x": 7.2, "y": 38.7, "seatName": "AN-3", "seatTier": "none" }, "row13-col3": { "x": 10.3, "y": 38.7, "seatName": "AN-4", "seatTier": "none" }, "row13-col4": { "x": 13.4, "y": 38.7, "seatName": "AN-5", "seatTier": "none" }, "row13-col5": { "x": 16.5, "y": 38.7, "seatName": "AN-6", "seatTier": "none" }, "row13-col6": { "x": 19.6, "y": 38.7, "seatName": "AN-7", "seatTier": "none" }, "row13-col7": { "x": 22.700000000000003, "y": 38.7, "seatName": "AN-8", "seatTier": "none" }, "row13-col8": { "x": 25.8, "y": 38.7, "seatName": "AN-9", "seatTier": "none" }, "row13-col9": { "x": 28.9, "y": 38.7, "seatName": "AN-10", "seatTier": "none" }, "row13-col10": { "x": 32, "y": 38.7, "seatName": "AN-11", "seatTier": "none" }, "row13-col11": { "x": 35.1, "y": 38.7, "seatName": "AN-12", "seatTier": "none" }, "row13-col12": { "x": 38.2, "y": 38.7, "seatName": "AN-13", "seatTier": "none" }, "row13-col13": { "x": 41.3, "y": 38.7, "seatName": "AN-14", "seatTier": "none" }, "row13-col14": { "x": 44.400000000000006, "y": 38.7, "seatName": "AN-15", "seatTier": "none" }, "row13-col15": { "x": 47.5, "y": 38.7, "seatName": "AN-16", "seatTier": "none" }, "row13-col16": { "x": 50.6, "y": 38.7, "seatName": "AN-17", "seatTier": "none" }, "row13-col17": { "x": 53.7, "y": 38.7, "seatName": "AN-18", "seatTier": "none" }, "row13-col18": { "x": 56.8, "y": 38.7, "seatName": "AN-19", "seatTier": "none" }, "row13-col19": { "x": 59.900000000000006, "y": 38.7, "seatName": "AN-20", "seatTier": "none" }, "row13-col20": { "x": 63, "y": 38.7, "seatName": "AN-21", "seatTier": "none" }, "row13-col21": { "x": 66.1, "y": 38.7, "seatName": "AN-22", "seatTier": "none" }, "row13-col22": { "x": 69.2, "y": 38.7, "seatName": "AN-23", "seatTier": "none" }, "row13-col23": { "x": 72.3, "y": 38.7, "seatName": "AN-24", "seatTier": "none" }, "row13-col24": { "x": 75.4, "y": 38.7, "seatName": "AN-25", "seatTier": "none" }, "row13-col25": { "x": 78.5, "y": 38.7, "seatName": "AN-26", "seatTier": "none" }, "row13-col26": { "x": 81.6, "y": 38.7, "seatName": "AN-27", "seatTier": "none" }, "row13-col27": { "x": 84.7, "y": 38.7, "seatName": "AN-28", "seatTier": "none" }, "row13-col28": { "x": 87.80000000000001, "y": 38.7, "seatName": "AN-29", "seatTier": "none" }, "row13-col29": { "x": 90.9, "y": 38.7, "seatName": "AN-30", "seatTier": "none" }, "row13-col30": { "x": 94, "y": 38.7, "seatName": "AN-31", "seatTier": "none" }, "row13-col31": { "x": 97.1, "y": 38.7, "seatName": "AN-32", "seatTier": "none" }, "row13-col32": { "x": 100.2, "y": 38.7, "seatName": "AN-33", "seatTier": "none" }, "row13-col33": { "x": 103.30000000000001, "y": 38.7, "seatName": "AN-34", "seatTier": "none" }, "row13-col34": { "x": 106.4, "y": 38.7, "seatName": "AN-35", "seatTier": "none" }, "row13-col35": { "x": 109.5, "y": 38.7, "seatName": "AN-36", "seatTier": "none" }, "row13-col36": { "x": 112.6, "y": 38.7, "seatName": "AN-37", "seatTier": "none" }, "row13-col37": { "x": 115.7, "y": 38.7, "seatName": "AN-38", "seatTier": "none" }, "row13-col38": { "x": 118.80000000000001, "y": 38.7, "seatName": "AN-39", "seatTier": "none" }, "row13-col39": { "x": 121.9, "y": 38.7, "seatName": "AN-40", "seatTier": "none" }, "row13-col40": { "x": 125, "y": 38.7, "seatName": "AN-41", "seatTier": "none" }, "row13-col41": { "x": 128.1, "y": 38.7, "seatName": "AN-42", "seatTier": "none" }, "row13-col42": { "x": 131.2, "y": 38.7, "seatName": "AN-43", "seatTier": "none" }, "row13-col43": { "x": 134.3, "y": 38.7, "seatName": "AN-44", "seatTier": "none" }, "row13-col44": { "x": 137.4, "y": 38.7, "seatName": "AN-45", "seatTier": "none" }, "row13-col45": { "x": 140.5, "y": 38.7, "seatName": "AN-46", "seatTier": "none" }, "row13-col46": { "x": 143.6, "y": 38.7, "seatName": "AN-47", "seatTier": "none" }, "row13-col47": { "x": 146.7, "y": 38.7, "seatName": "AN-48", "seatTier": "none" }, "row13-col48": { "x": 149.8, "y": 38.7, "seatName": "AN-49", "seatTier": "none" }, "row13-col49": { "x": 152.9, "y": 38.7, "seatName": "AN-50", "seatTier": "none" } }, "rowGap": 0.9, "colGap": 1.1, "layoutRadius": 500, "seatRadius": 1, "angle": 0, "groupX": 290.7259521484375, "groupY": 111.4139633178711 } }, "points": { "point1": { "x": 287.9422912597656, "y": 111.35819244384766, "figure": "line" }, "point2": { "x": 448.1204528808594, "y": 111.90013122558594, "figure": "arc", "radius": 247, "inverted": 1, "remaining": 0 }, "point3": { "x": 448.1204528808594, "y": 160.02484130859375, "figure": "line" }, "point4": { "x": 287.52398681640625, "y": 159.8818359375, "figure": "arc", "radius": 446, "inverted": 0, "remaining": 0 } }, "d": "M287.9422912597656 111.35819244384766 A247 247 0 0 1 448.1204528808594 111.90013122558594 L448.1204528808594 160.02484130859375 A446 446 0 0 0 287.52398681640625 159.8818359375 Z" }, "displayOnly3": { "name": "", "price": "", "textX": 318.41595458984375, "textY": 255.55836486816406, "textAngle": 0, "textFont": 10, "color": "#07a622", "seats": {}, "points": { "point1": { "x": 319.657470703125, "y": 255.84518432617188, "figure": "line" }, "point2": { "x": 415.90521240234375, "y": 256.0005798339844, "figure": "line" }, "point3": { "x": 416.3636474609375, "y": 431.9695739746094, "figure": "line" }, "point4": { "x": 319.72039794921875, "y": 431.9695739746094, "figure": "line" } }, "d": "M319.657470703125 255.84518432617188 L415.90521240234375 256.0005798339844 L416.3636474609375 431.9695739746094 L319.72039794921875 431.9695739746094 Z" }, "displayOnly2": { "name": "", "price": "", "textX": 339.7768249511719, "textY": 278.72149658203125, "textAngle": 0, "textFont": 10, "color": "#b0d58b", "seats": {}, "points": { "point1": { "x": 339.7768249511719, "y": 278.72149658203125, "figure": "line" }, "point2": { "x": 396.5749206542969, "y": 278.72149658203125, "figure": "line" }, "point3": { "x": 396.3819580078125, "y": 413.3688659667969, "figure": "line" }, "point4": { "x": 339.6534118652344, "y": 413.7833557128906, "figure": "line" } }, "d": "M339.7768249511719 278.72149658203125 L396.5749206542969 278.72149658203125 L396.3819580078125 413.3688659667969 L339.6534118652344 413.7833557128906 Z" } }
      setseatLayout({})
    })()
  }, [])

  const handleSectionClick = (event, textX, textY, targetScale) => {
    const pathElement = event.target;
    const panzoom = panzoomInstance.current;

    // Guard clause to ensure panzoom instance exists
    if (!panzoom) return;

    const centerX = textX
    const centerY = textY
    console.log('clicked')
    const svg = sceneRef.current;
    const point = svg.createSVGPoint();
    point.x = textX / 800 * width;
    point.y = textY / 800 * width;
    const svgCoords = point.matrixTransform(svg.getScreenCTM().inverse());
    let x = svgCoords.x
    let y = svgCoords.y
    console.log(x, y)
    console.log(centerX, centerY)
    // This scales and shifts the view to frame the coordinates seamlessly.
    if (panzoom.getTransform().scale < targetScale) {
      panzoom.smoothZoomAbs(centerX, centerY, targetScale);
    }
  };

  const handleSeatHover = (e) => {
    const seat = e.target.closest('circle')
    if (!seat) {
      setHoveredSeat({})
      return;
    }
    let seatDetail = JSON.parse(seat.dataset.key)

    if (!editingSectionSeat.includes(seatDetail.sectionKey)) {
      return
    }

    if (hoveredSeat != seatDetail) {
      setHoveredSeat(seatDetail)
    }
  }

  const handleSeatClick = (e) => {
    const seat = e.target.closest('circle')
    if (!seat) {
      console.log('no seat')
      return;
    }

    let seatDetail = JSON.parse(seat.dataset.key)

    if (!editingSectionSeat.includes(seatDetail.sectionKey)) {
      return
    }
    console.log(seatDetail)
    console.log(selectDeleteSeat)

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (!selectDeleteSeat.includes(seatDetail)) {
        setSelectDeleteSeat([...selectDeleteSeat, seatDetail])
      }
    } else {
      if (JSON.stringify(editingSeat) === JSON.stringify(seatDetail)) {
        setEditingSeat(null)
      } else {
        setEditingSeat(seatDetail);
      }
    }
  }

  const resetDisplay = () => {
    const panzoom = panzoomInstance.current
    panzoom.zoomAbs(0, 0, 1)
  }


  const handleGridMouseDown = (e) => {
    if (e.target.id === 'svg_canvas') {
      currentCordinates.current = { X: e.clientX, Y: e.clientY, button: e.button }
    }
  }

  const handleGridMouseMove = (e) => {
    if (currentCordinates.current != null) {
      const panzoom = panzoomInstance.current
      const transform = panzoom.getTransform()
      if (Math.abs(e.clientX - currentCordinates.current.X) > 5 / transform.scale || Math.abs(e.clientY - currentCordinates.current.Y) > 5 / transform.scale) {
        isDragged.current = true
        currentCordinates.current = null
      }
    }

  }

  const handleGridMouseUp = () => {
    if (!isDragged.current) {
      if (currentCordinates.current) {
        makeFigure(currentCordinates.current)
        currentCordinates.current = null
      }

    } else {
      isDragged.current = false
    }
    setLayoutClicked(false)
    seteditClicked(false)
  }

  const handleAddSection = () => {
    setFigure('polygon')
    setIsSectionCreated(false)
  }

  const handleEnter = (e) => {
    if (e.key === 'Enter' && tempSide && polygonPoints.length === polysides.length) {
      alert('Left click for line and Right click for arcs')
      setClicked(true)
      setPolysides([...polysides, tempSide])
    }
  }

  const saveSeatLayout = async () => {
    if (!venueDetail) {
      if (!venueId) {
        try {
          console.log({ ...formData, seatLayout })
          let newLayout = { ...seatLayout }

          Object.entries(newLayout).map(([section_key, section_val]) => {

            Object.entries(section_val.seats).map(([layout_key, layout_val]) => {
              if (layout_val.deletedSeats) {
                for (let seat of layout_val.deletedSeats) {
                  delete newLayout[section_key].seats[layout_key].seat_data[seat]
                }
                delete newLayout[section_key].seats[layout_key].deletedSeats
              }
            })
          })

          console.log(newLayout)
          console.log({ ...formData, newLayout })
          navigator.clipboard.writeText(JSON.stringify(seatLayout));
          setDisplayLayout('none')
          const response = await axios.post('http://localhost:5000/api/events', { ...formData, seatLayout: newLayout })
          console.log(response)
          alert("Saved")

        } catch (error) {
          console.error(error)
          alert('Sorry there is a proble in saving Event')
        }
      }
      else {
        try {
          let newLayout = { ...seatLayout }

          Object.entries(newLayout).map(([section_key, section_val]) => {

            delete newLayout[section_key].price
            Object.entries(section_val.seats).map(([layout_key, layout_val]) => {

              Object.entries(layout_val.seat_data).map(([seat_key, seat_val]) => {

                delete newLayout[section_key].seats[layout_key].seat_data[seat_key].seatPrice
              })
              console.log(layout_val.deletedSeats)
              if (layout_val.deletedSeats) {
                for (let seat of layout_val.deletedSeats) {
                  delete newLayout[section_key].seats[layout_key].seat_data[seat]
                }
                delete newLayout[section_key].seats[layout_key].deletedSeats
              }
            })
          })

          const response = await axios.put('http://localhost:5000/api/events/venue', { venue: { ...venue, seatLayout: newLayout } })
          console.log(response)
          alert("Saved")
        } catch (error) {
          console.error(error)
          alert('Sorry there is a proble in saving Venue')
        }
      }

    } else {
      try {
        console.log(venueDetail)
        let newLayout = { ...seatLayout }

        Object.entries(newLayout).map(([section_key, section_val]) => {

          delete newLayout[section_key].price
          Object.entries(section_val.seats).map(([layout_key, layout_val]) => {

            Object.entries(layout_val.seat_data).map(([seat_key, seat_val]) => {

              delete newLayout[section_key].seats[layout_key].seat_data[seat_key].seatPrice
            })
            if (layout_val.deletedSeats) {
              for (let seat of layout_val.deletedSeats) {
                delete newLayout[section_key].seats[layout_key].seat_data[seat]
              }
              delete newLayout[section_key].seats[layout_key].deletedSeats
            }
          })
        })
        const response = await axios.put('http://localhost:5000/api/events/venue', { ...venueDetail, seatLayout: newLayout })
        console.log(response)
        alert("Saved")
      } catch (error) {
        console.error(error)
        alert('Sorry there is a proble in saving Venue')
      }
    }
  }

  const layoutGenerate = (layout_key, key, newSeatLayout) => {

    let seat = newSeatLayout[key].seats[layout_key]
    let seat_idx = Object.entries(newSeatLayout[key].seats).length
    newSeatLayout[key].seats[layout_key].seat_data = {}

    for (let i = 0; i < seat.rows; i++) {

      let column = 1
      let colLength = (2 * seat.rows - 1) * seat.seatRadius + (seat.rows - 1) * seat.rowGap + seat.layoutRadius
      let angle = (seat.seatRadius * (2 * (seat.columns - 1)) + seat.colGap * (seat.columns - 1)) / seat.layoutRadius
      let arcLength = angle * (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i))
      let seats = Math.floor(arcLength / (2 * seat.seatRadius + seat.colGap))
      let newcolGap = arcLength / seats - 2 * seat.seatRadius
      let letter = 'A'

      if (seat.type === 'arc') {

        for (let j = 0; j < seats + 1; j++) {
          const ref_key = `row${i}-col${j}`
          if (!seat.deletedSeats.includes(ref_key)) {
            let arcangle = (seat.seatRadius * (2 * j) + newcolGap * j) / (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i))
            let sin = Math.sin(arcangle)
            let cos = Math.cos(arcangle)
            let x = (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius
            let y = colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos

            if (seat.seat_data[ref_key]) {
              seat.seat_data[ref_key].x = x
              seat.seat_data[ref_key].y = y
              seat.seat_data[ref_key].seatName = seatLayout[key].seats[layout_key].seat_data[ref_key].seatName || `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`
              seat.seat_data[ref_key].seatPrice = seatLayout[key].seats[layout_key].seat_data[ref_key].seatPrice || seatLayout[key].price

            }
            else {
              seat.seat_data[ref_key] = { x, y, seatName: `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`, seatPrice: seatLayout[key].price, seatTier: "none" }
            }
            column++
          }
        }
      } else {

        for (let j = 0; j < seat.columns; j++) {
          const ref_key = `row${i}-col${j}`
          if (!seat.deletedSeats?.includes(ref_key)) {
            if (seat.type === 'linear') {
              if (seat.seat_data[ref_key]) {
                seat.seat_data[ref_key].x = seat.seatRadius * (2 * j + 1) + seat.colGap * j
                seat.seat_data[ref_key].y = seat.seatRadius * (2 * i + 1) + seat.rowGap * i
                seat.seat_data[ref_key].seatName = seatLayout[key].seats[layout_key].seat_data[ref_key].seatName || `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`
                seat.seat_data[ref_key].seatPrice = seatLayout[key].seats[layout_key].seat_data[ref_key].seatPrice || seatLayout[key].price
              }
              else {
                seat.seat_data[ref_key] = { x: seat.seatRadius * (2 * j + 1) + seat.colGap * j, y: seat.seatRadius * (2 * i + 1) + seat.rowGap * i, seatName: `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`, seatPrice: seatLayout[key].price, seatTier: "none" }
              }
            }
            else if (seat.type === 'arcFixed') {
              let colLength = (2 * seat.rows - 1) * seat.seatRadius + (seat.rows - 1) * seat.rowGap + seat.layoutRadius
              let angle = (seat.seatRadius * (2 * j) + seat.colGap * j) / seat.layoutRadius
              let sin = Math.sin(angle)
              let cos = Math.cos(angle)
              if (seat.seat_data[ref_key]) {
                seat.seat_data[ref_key].x = (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius
                seat.seat_data[ref_key].y = colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos
                seat.seat_data[ref_key].seatName = seatLayout[key].seats[layout_key].seat_data[ref_key].seatName || `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`
                seat.seat_data[ref_key].seatPrice = seatLayout[key].seats[layout_key].seat_data[ref_key].seatPrice || seatLayout[key].price
              }
              else {
                seat.seat_data[ref_key] = { x: (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius, y: colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos, seatName: `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`, seatPrice: seatLayout[key].price, seatTier: "none" }
              }

            }
            column++
          }
        }
      }
    }
    // delete seat.deletedSeats

  }

  return (
    <>
      <div className="flex" ref={containerRef}>

        <div className="w-137" pointerEvents="none">
          <ImageUpload setImage={setImage} />

          <div>
            <div className='flex '>
              <button className='border rounded border-white pl-1 pr-1 m-2 bg-[#1f559b] cursor-pointer block' onClick={handleAddSection}>Add Section</button>
              <div className='p-2 rounded'>
                <label htmlFor='displayOnly' className='m-1 mt-2'>Add Display Only Sections</label>
                <input type='checkbox' id='displayOnly' className='cursor-pointer' onChange={(e) => {
                  if (e.target.checked) { setDisplayOnly(true) }
                  else { setDisplayOnly(false) }
                }} />
              </div>
            </div>
            {[figure].map((element, index) => {
              if (element === 'polygon' && !isSectionCreated) {
                return (
                  <Fragment key={index}>
                    <label htmlFor="sides" className='ml-1'>Sides</label>
                    <input type="text" id='sides' name='sides' placeholder='Enter no. of sides of polygon' className='pl-1 border border-white rounded m-1' onChange={(e) => { setTempSide(parseInt((e.target.value).trim())) }} onKeyDown={handleEnter}></input>
                    <button className="cursor-pointer border border-white bg-amber-300 text-white pl-2 pr-2 rounded m-1" onClick={() => {
                      // if (tempSide && polygonPoints.length === polysides.length) {
                      alert('Left click for line and Right click for arcs')
                      setClicked(true)
                      setPolysides([...polysides, tempSide])
                      // }
                    }}>Set</button>
                  </Fragment>
                )
              }
            })}
          </div>



          {/* <div className="choose">
            <label htmlFor="figure_choose">Figure</label>
            <select name="figure_choose" id="figure_choose" className='border border-white rounded m-1' onChange={changeFigure}>
              <option value="line">Line</option>
              <option value="arc">Arc</option>
              <option value="polygon">Polygon</option>
            </select>
          </div> */}


          {/* {arcPoints.map((element, index) => { // radius and the inverted checkbox section for each arc
            if (((index + 2) <= arcPoints.length && index % 2 === 0) && arcPoints.length > 0) {

              return (
                <Fragment key={`${index}`}>
                  <div className="radius flex m-auto">
                    <label htmlFor={`radius:${index / 2 + 1}`}>{`Radius: Arc${index / 2 + 1}  `}</label>
                    <input type="number" id={`radius:${index / 2 + 1}`} step={1} min={1} max={1000} defaultValue='100' className='border border-amber-50 rounded pl-0.5 ml-0.5' onChange={(e) => {
                      setRadius(prev => {
                        const newRadii = [...prev];
                        newRadii[index / 2] = e.target.value;
                        return newRadii;
                      })
                    }} />
                    <div className={`radius${index / 2 + 1}value`}>{radius[index / 2]}</div>
                    <label htmlFor={`inverted${index / 2}`} className='ml-2 mr-1'>{`Inverted arc`}</label>
                    <input type="checkbox" id={`inverted${index / 2}`} defaultValue="no" onChange={(e) => {
                      setInverted(prev => {
                        const newInverted = [...prev]
                        if (e.target.checked) {
                          newInverted[index / 2] = 1
                        } else { newInverted[index / 2] = 0 }
                        return newInverted
                      })
                    }} />
                    <label htmlFor={`remaining${index / 2}`} className='ml-2 mr-1'>{`Remaining arc`}</label>
                    <input type="checkbox" id={`remaining${index / 2}`} defaultValue="no" onChange={(e) => {
                      setRemaining(prev => {
                        const newRemaining = [...prev]
                        if (e.target.checked) {
                          newRemaining[index / 2] = 1
                        } else { newRemaining[index / 2] = 0 }
                        return newRemaining
                      })
                    }} />
                  </div>
                </Fragment>
              )
            }
          })} */}


          <div className='overflow-auto h-160 '>
            {polygonPoints.map((element, index) => { // radius and the inverted checkbox section for each arc of polygon
              if (polygonPoints.length > 0) {
                let j = 0
                index = polygonPoints.length - (index + 1)
                element = polygonPoints[index]
                return (
                  <div key={`polygonArcs: ${index}`} className='border border-[#787877] rounded mt-1'>
                    <div className='p-1 flex justify-between rounded'>
                      <span className='underline cursor-pointer' onClick={() => {
                        if (clickedSection === `index${index}`) {
                          setClickedSection('')
                        } else {
                          setClickedSection(`index${index}`)
                        }
                      }}>{`Section-${index + 1}`}</span>

                      <span className='flex gap-2'>
                        {((sectionName[index]?.done && !sectionName[index]?.displayOnly) && !sectionName[index]?.seats) && (
                          <button className='border rounded-2xl pl-2 pr-2 bg-[#1f559b] cursor-pointer' onClick={() => {
                            let newSectionName = [...sectionName]
                            newSectionName[index].seats = []
                            setSectionName(newSectionName)
                          }}>Add Seats</button>
                        )}

                        {sectionName[index]?.seatDone && (
                          <button className='pr-1 pl-1 bg-[#7f1313] rounded cursor-pointer' onClick={() => {
                            let newSectionName = [...sectionName]
                            newSectionName.splice(index, 1)
                            setSectionName(newSectionName)
                            let new_polyPoints = [...polygonPoints]
                            new_polyPoints.splice(index, 1)
                            setpolygonPoints(new_polyPoints)
                            let new_polySides = [...polysides]
                            new_polySides.splice(index, 1)
                            setPolysides(new_polyPoints)
                          }}>Delete Section</button>
                        )}
                      </span>

                    </div>
                    <div>
                      {(sectionName[index]?.seats && !sectionName[index]?.seatDone) && (
                        <div>
                          <div className="flex">
                            <label htmlFor={`row${index}`} className='m-1'>Number of rows</label>
                            <input type="number" min={1} max={100} defaultValue={1} className='border border-white rounded m-1 pl-1' id={`row${index}`} ref={(el) => { seatLayoutRows.current[index] = el }} />
                          </div>

                          <div className="flex">
                            <label htmlFor={`rowNumber${index}`} className='m-1'>Seats in each row</label>
                            <input type="number" min={1} max={100} id={`rowNumber${index}`} defaultValue={1} className='border border-white rounded m-1 pl-1' ref={(el) => { seatLayoutCols.current[index] = el }} />
                          </div>

                          <div className="flex">
                            <label htmlFor="layoutType" className='m-1'>Seats Layout Type</label>
                            <select name="layoutType" id="layoutType" className='border border-white rounded m-1 cursor-pointer' ref={(el) => { seatLayoutType.current[index] = el }}>
                              <option value="linear">Linear</option>
                              <option value="arc">Arc</option>
                              <option value="arcFixed">Arc With Fixed Seats</option>
                            </select>
                          </div>

                          <button className='m-2 pl-2 pr-2 bg-green-900 border border-white rounded-2xl cursor-pointer' onClick={() => {
                            let newSectionName = [...sectionName]
                            newSectionName[index].seats.push({
                              rows: parseInt(seatLayoutRows.current[index].value),
                              columns: parseInt(seatLayoutCols.current[index].value),
                              type: (seatLayoutType.current[index].value),
                              seat_data: {},
                              rowGap: 5,
                              colGap: 5,
                              layoutRadius: 500,
                              seatRadius: 1,
                              angle: 0,
                              groupX: element[0].x,
                              groupY: element[0].y,
                              deletedSeats: []
                            })
                            setSectionName(newSectionName)
                            alert("Press CTRL or SHIFT and then click on seat to delete")
                          }} >Generate Seat Layout</button>

                          {sectionName[index].seats.length > 0 && (
                            <Fragment>
                              <div className='grid grid-cols-2 justify-items-center w-125'>
                                {
                                  sectionName[index].seats.map((ele, idx) => {
                                    return (
                                      <div key={idx} className=' m-1 rounded w-fit p-1 bg-[#ffffff12] flex flex-col justify-around border'>
                                        <div className='w-fit underline m-1 mt-0'>{`Seat Layout - ${idx + 1}`}</div>
                                        <div className='w-fit'>
                                          <label htmlFor={`seatRadius${index}`} className='m-1'>Seat Radius</label>
                                          <input type="number" min={0.1} max={50} defaultValue={1} step={0.1} className='border border-white rounded m-1 pl-1' id={`seatRadius${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].seatRadius = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>

                                        <div className='w-fit'>
                                          <label htmlFor={`rowGap${index}`} className='m-1'>Row Gap</label>
                                          <input type="number" min={0.1} max={50} step={0.1} defaultValue={5} className='border border-white rounded m-1 pl-1' id={`rowGap${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].rowGap = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>

                                        <div className='w-fit'>
                                          <label htmlFor={`colGap${index}`} className='m-1'>Column Gap</label>
                                          <input type="number" min={0.1} max={50} step={0.1} defaultValue={5} className='border border-white rounded m-1 pl-1' id={`colGap${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].colGap = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>

                                        <div className='w-fit'>
                                          <label htmlFor={`seatLayoutAngle${index}`} className='m-1'>Layout Angle</label>
                                          <input type="number" min={-180} max={180} defaultValue={0} className='border border-white rounded m-1 pl-1' id={`seatLayoutAngle${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].angle = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>

                                        <div className='w-fit'>
                                          <label htmlFor={`groupX${index}`} className='m-1'>Layout X-dist</label>
                                          <input type="number" min={0} max={800} value={ele.groupX} className='border border-white rounded m-1 pl-1' id={`groupX${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].groupX = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>

                                        <div className='w-fit'>
                                          <label htmlFor={`groupY${index}`} className='m-1'>Layout Y-dist</label>
                                          <input type="number" min={0} max={800} value={ele.groupY} className='border border-white rounded m-1 pl-1' id={`groupY${index}`} onChange={(e) => {
                                            let newSectionName = [...sectionName]
                                            newSectionName[index].seats[idx].groupY = Number(e.target.value)
                                            setSectionName(newSectionName)
                                          }} />
                                        </div>

                                        {(ele.type === 'arc' || ele.type === 'arcFixed') && (
                                          <div className='w-fit'>
                                            <label htmlFor={`layoutRadius${index}`} className='m-1'>Arc Radius</label>
                                            <input type="number" min={1} max={1000} defaultValue={500} className='border border-white rounded m-1 pl-1' id={`layoutRadius${index}`} onChange={(e) => {
                                              let newSectionName = [...sectionName]
                                              newSectionName[index].seats[idx].layoutRadius = Number(e.target.value)
                                              setSectionName(newSectionName)
                                            }} />
                                          </div>
                                        )}
                                        <button className=' bg-[#7f1313] rounded pl-1 pr-1 m-1 cursor-pointer' onClick={() => {
                                          let newSectionName = [...sectionName]
                                          newSectionName[index].seats.splice(idx, 1)
                                          setSectionName(newSectionName)
                                          setEditingSeat(null)
                                          setSelectedSeats(new Set())
                                        }}>Delete Layout</button>

                                      </div>

                                    )
                                  })
                                }

                              </div>
                              {/* Delete Button Menu Bar */}

                              {/* Individual Seat Property Editor Panel */}
                              {(editingSeat && editingSeat.secIdx === index) && (
                                <div className="m-2 w-fit border rounded p-1">
                                  <h3 className='m-1 ml-0 w-fit underline'>Edit Seat Details</h3>
                                  <div className='ml-1 w-fit'>Layout Index: {editingSeat.grpIdx + 1} | Row: {editingSeat.row + 1} | Col: {editingSeat.col + 1}</div>

                                  <div className='w-fit'>
                                    <label className='m-1'>Seat Name:</label>
                                    <input type="text" placeholder="e.g. A-12" className='border m-1 border-white rounded pl-1' ref={(el) => { seatNameRef.current[index] = el }} />
                                  </div>

                                  <div className='w-fit'>
                                    <label className='ml-1'>Price (₹):</label>
                                    <input type="number" min={0} placeholder="e.g. 150" className='border border-white rounded ml-1 pl-1' ref={(el) => { seatPriceRef.current[index] = el }} />
                                  </div>

                                  <div className='w-fit'>
                                    <label className='m-1'>Tier Category:</label>
                                    <select className='border m-1 border-white rounded' ref={(el) => { seatTierRef.current[index] = el }}>
                                      <option value="none">None</option>
                                      <option value="vip">VIP</option>
                                      <option value="premium">Premium</option>
                                      <option value="standard">Standard</option>
                                    </select>
                                  </div>


                                  <button onClick={() => {
                                    let newSectionName = [...sectionName]
                                    let seatName = seatNameRef.current[index]?.value.trim() || `row:${editingSeat.row}-col:${editingSeat.col}`
                                    let seatPrice = seatPriceRef.current[index]?.value.trim() || newSectionName[index].price
                                    let seatTier = seatTierRef.current[index]?.value.trim()
                                    newSectionName[index].seats[editingSeat.grpIdx].seat_data[`row${editingSeat.row}-col${editingSeat.col}`] = { seatName, seatPrice, seatTier }
                                    setSectionName(newSectionName)
                                    let newDoneseats = [...doneSeats, editingSeat.seatKey]
                                    setDoneSeats(newDoneseats)
                                    if (seatPrice) {
                                      setEditingSeat(null)
                                    }
                                  }} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-green-900'>Save Details</button>

                                  <button onClick={() => {
                                    setEditingSeat(null)
                                  }} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-[#765817]'>Cancel</button>
                                </div>
                              )}
                              {selectedSeats.size > 0 && (
                                <Fragment>
                                  <span className='m-1'>{selectedSeats.size} seats selected</span>
                                  <button onClick={deleteSelectedSeats} className='rounded bg-[#7f1313] pl-1 pr-1 cursor-pointer'>
                                    Delete Selected Seats
                                  </button>
                                </Fragment>
                              )}
                              <button className='border rounded-2xl bg-[#183a67] pl-2 pr-2 ml-5 mb-2 cursor-pointer' onClick={() => {
                                let newSectionName = [...sectionName]
                                if (editingSeat?.secIdx === index) {
                                  setEditingSeat(null)
                                }
                                newSectionName[index].seatDone = true
                                for (let [seat_idx, seat] of newSectionName[index].seats.entries()) {
                                  for (let i = 0; i < seat.rows; i++) {
                                    let column = 1
                                    let colLength = (2 * seat.rows - 1) * seat.seatRadius + (seat.rows - 1) * seat.rowGap + seat.layoutRadius
                                    let angle = (seat.seatRadius * (2 * (seat.columns - 1)) + seat.colGap * (seat.columns - 1)) / seat.layoutRadius
                                    let arcLength = angle * (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i))
                                    let seats = Math.floor(arcLength / (2 * seat.seatRadius + seat.colGap))
                                    let newcolGap = arcLength / seats - 2 * seat.seatRadius
                                    let letter = 'A'

                                    if (seat.type === 'arc') {

                                      for (let j = 0; j < seats + 1; j++) {
                                        const key = `row${i}-col${j}`
                                        if (!seat.deletedSeats.includes(key)) {
                                          let arcangle = (seat.seatRadius * (2 * j) + newcolGap * j) / (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i))
                                          let sin = Math.sin(arcangle)
                                          let cos = Math.cos(arcangle)
                                          let x = (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius
                                          let y = colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos

                                          if (seat.seat_data[key]) {
                                            seat.seat_data[key].x = x
                                            seat.seat_data[key].y = y
                                            seat.seat_data[key].seatName = seat.seat_data[key].seatName || `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`
                                            seat.seat_data[key].seatPrice = seat.seat_data[key].seatPrice || sectionName[index].price

                                          }
                                          else {
                                            seat.seat_data[key] = { x, y, seatName: `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`, seatPrice: newSectionName[index].price, seatTier: "none" }
                                          }
                                          column++
                                        }
                                      }
                                    } else {

                                      for (let j = 0; j < seat.columns; j++) {
                                        const key = `row${i}-col${j}`
                                        if (!seat.deletedSeats.includes(key)) {
                                          if (seat.type === 'linear') {
                                            if (seat.seat_data[key]) {
                                              seat.seat_data[key].x = seat.seatRadius * (2 * j + 1) + seat.colGap * j
                                              seat.seat_data[key].y = seat.seatRadius * (2 * i + 1) + seat.rowGap * i
                                              seat.seat_data[key].seatName = seat.seat_data[key].seatName || `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`
                                              seat.seat_data[key].seatPrice = seat.seat_data[key].seatPrice || sectionName[index].price
                                            }
                                            else {
                                              seat.seat_data[key] = { x: seat.seatRadius * (2 * j + 1) + seat.colGap * j, y: seat.seatRadius * (2 * i + 1) + seat.rowGap * i, seatName: `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`, seatPrice: newSectionName[index].price, seatTier: "none" }
                                            }
                                          }
                                          else if (seat.type === 'arcFixed') {
                                            let colLength = (2 * seat.rows - 1) * seat.seatRadius + (seat.rows - 1) * seat.rowGap + seat.layoutRadius
                                            let angle = (seat.seatRadius * (2 * j) + seat.colGap * j) / seat.layoutRadius
                                            let sin = Math.sin(angle)
                                            let cos = Math.cos(angle)
                                            if (seat.seat_data[key]) {
                                              seat.seat_data[key].x = (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius
                                              seat.seat_data[key].y = colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos
                                              seat.seat_data[key].seatName = seat.seat_data[key].seatName || `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`
                                              seat.seat_data[key].seatPrice = seat.seat_data[key].seatPrice || sectionName[index].price
                                            }
                                            else {
                                              seat.seat_data[key] = { x: (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * sin + seat.seatRadius, y: colLength - (colLength - (seat.seatRadius * (2 * i + 1) + seat.rowGap * i)) * cos, seatName: `${String.fromCharCode(seat_idx + letter.charCodeAt(0))}${String.fromCharCode(i + letter.charCodeAt(0))}-${column}`, seatPrice: newSectionName[index].price, seatTier: "none" }
                                            }

                                          }
                                          column++
                                        }
                                      }
                                    }
                                  }
                                  // delete seat.deletedSeats
                                }

                                let sec_idx = 0
                                for (let sec of Object.entries(seatLayout)) {
                                  if (sec[0].startsWith('section')) {
                                    const match = sec[0].match(/\d+/);
                                    let j;
                                    if (match) {
                                      j = parseInt(match[0], 10);
                                    }
                                    if (j > sec_idx) sec_idx = j;
                                  }
                                }

                                let layout = {}
                                layout[`section${parseInt(sec_idx) + 1}`] = {
                                  name: newSectionName[index].text ?? '',
                                  price: newSectionName[index].price ?? '',
                                  textX: newSectionName[index].x,
                                  textY: newSectionName[index].y,
                                  textAngle: newSectionName[index].rotate ?? 0,
                                  textFont: newSectionName[index].font ?? 10,
                                  color: newSectionName[index].color ?? 'pink',
                                  seats: {},
                                  points: {}
                                }

                                for (let seatIdx in newSectionName[index].seats) {
                                  layout[`section${parseInt(sec_idx) + 1}`].seats[`layout${parseInt(seatIdx) + 1}`] = newSectionName[index].seats[seatIdx]
                                }

                                let d = `M${polygonPoints[index][0].x} ${polygonPoints[index][0].y}`

                                polygonPoints[index].forEach((ele, idx) => {

                                  if (ele.figure === 'arc') {

                                    let combined = { ...ele, ...polyarc[index][idx] }
                                    layout[`section${parseInt(sec_idx) + 1}`].points[`point${idx + 1}`] = combined
                                    console.log(combined, ele, idx, polyarc, polyarc[idx], { ...polyarc[idx] })

                                    if (idx != 0) d += ` A${combined.radius ?? 100} ${combined.radius ?? 100} 0 ${combined.remaining ?? 0} ${combined.inverted ?? 0} ${combined.x} ${combined.y}`
                                  } else {
                                    layout[`section${parseInt(sec_idx) + 1}`].points[`point${idx + 1}`] = ele
                                    if (idx != 0) d += ` L${ele.x} ${ele.y}`
                                  }
                                });

                                if (polygonPoints[index][0].figure === 'arc') d += ` A${polygonPoints[index][0].radius ?? 100} ${polygonPoints[index][0].radius ?? 100} 0 ${polygonPoints[index][0].remaining} ?? 0 ${polygonPoints[index][0].inverted ?? 0} ${polygonPoints[index][0].x} ${polygonPoints[index][0].y}`
                                else { d += ' Z' }
                                layout[`section${parseInt(sec_idx) + 1}`].d = d


                                newSectionName.splice(index, 1)
                                setseatLayout({ ...seatLayout, ...layout })
                                setSectionName(newSectionName)
                                let newPolyPoints = [...polygonPoints]
                                newPolyPoints.splice(index, 1)
                                setpolygonPoints(newPolyPoints)

                              }}>Done</button>
                            </Fragment>
                          )}
                        </div>
                      )}
                    </div>

                    {element.map((point, idx) => {
                      if (point.figure === 'arc' && !sectionName[index]?.done) {
                        j++
                        return (
                          <div key={`${idx}`} className="polyarc flex m-auto p-1">
                            <label htmlFor={`radius:${idx}`}>{`Radius: Arc${j}`}</label>
                            <input type="number" id={`radius:${idx}}`} min={1} max={1000} className='border border-amber-100 ml-0.5 rounded pl-0.5' defaultValue='100' onChange={(e) => {
                              setPolyarc(prev => {
                                let newRadii = [...prev];
                                newRadii[index][idx].radius = Number(e.target.value);
                                return newRadii;
                              })
                            }} />
                            <label htmlFor={`inverted${idx}`} className='ml-2 mr-1'>{`Inverted arc`}</label>
                            <input type="checkbox" id={`inverted${idx}`} defaultValue="no" onChange={(e) => {
                              setPolyarc(prev => {
                                let newInverted = [...prev]
                                if (e.target.checked) {
                                  newInverted[index][idx]['inverted'] = 1
                                } else { newInverted[index][idx]['inverted'] = 0 }
                                return newInverted
                              })
                            }} />
                            <label htmlFor={`remaining${idx}`} className='ml-2 mr-1'>{`Remaining arc`}</label>
                            <input type="checkbox" id={`remaining${idx}`} defaultValue="no" onChange={(e) => {
                              setPolyarc(prev => {
                                let newRemaining = [...prev]
                                if (e.target.checked) {
                                  newRemaining[index][idx]['remaining'] = 1
                                } else { newRemaining[index][idx]['remaining'] = 0 }
                                return newRemaining
                              })
                            }} />
                          </div>
                        )
                      }
                    })}

                    {!sectionName[index]?.done &&
                      (<div className='m-1'>

                        <label htmlFor='sectionName'>Enter Section Name</label>
                        <input type="text" id='sectionName' ref={(el) => { sectionNameInput.current[index] = el }} className='border border-white rounded ml-1 pl-1' />

                        <button className="cursor-pointer border border-white bg-amber-300 text-white pl-2 pr-2 rounded m-1" onClick={() => {
                          let newSectionName = [...sectionName]
                          newSectionName[index] = { text: sectionNameInput.current[index].value?.trim(), x: (newSectionName[index]?.x ?? element[0].x), y: (newSectionName[index]?.y ?? element[0].y), rotate: (newSectionName[index]?.rotate ?? 0), font: (newSectionName[index]?.font ?? 10), color: (newSectionName[index]?.color ?? 'pink') }
                          setSectionName(newSectionName)
                        }}>Set</button>

                      </div>)
                    }

                    {((sectionName[index]?.text || (sectionName[index]?.text === '' && displayOnly)) && !sectionName[index]?.done) &&
                      (<div className=' m-1'>
                        {(sectionName[index]?.text !== '') && (
                          <Fragment>
                            <label htmlFor={`section${index}x`}>X-Dist</label>
                            <input type="number" min={0} max={800} value={sectionName[index].x} className='m-1 border border-white rounded' id={`section${index}x`} onChange={(e) => {
                              let newSectionName = [...sectionName]
                              newSectionName[index].x = Number(e.target.value)
                              setSectionName(newSectionName)
                            }} />

                            <label htmlFor={`section${index}y`}>Y-Dist</label>
                            <input type="number" min={0} max={800} value={sectionName[index].y} className='m-1 border border-white rounded' id={`section${index}y`} onChange={(e) => {
                              let newSectionName = [...sectionName]
                              newSectionName[index].y = Number(e.target.value)
                              setSectionName(newSectionName)
                            }} />

                            <label htmlFor={`section${index}rotate`}>Angle</label>
                            <input type="number" min={-180} max={180} defaultValue={sectionName[index].rotate} className='m-1 border border-white rounded' id={`section${index}rotate`} onChange={(e) => {
                              let newSectionName = [...sectionName]
                              newSectionName[index].rotate = Number(e.target.value)
                              setSectionName(newSectionName)
                            }} />

                            <label htmlFor={`section${index}font`}>Font</label>
                            <input type="number" min={1} max={30} defaultValue={sectionName[index].font} className='m-1 border border-white rounded' id={`section${index}font`} onChange={(e) => {
                              let newSectionName = [...sectionName]
                              newSectionName[index].font = Number(e.target.value)
                              setSectionName(newSectionName)
                            }} />
                          </Fragment>
                        )}

                        {!displayOnly && (
                          <div>
                            <label htmlFor={`section${index}price`}>Enter Section Price (₹)</label>
                            <input type="number" min={0} id={`section${index}price`} defaultValue={0} className='border border-white rounded m-1 pl-1' onChange={(e) => {
                              let newSectionName = [...sectionName]
                              newSectionName[index].price = (e.target.value)
                              setSectionName(newSectionName)
                            }} />
                          </div>
                        )}

                        <div>
                          <label htmlFor={`section${index}color`}>Enter Section Color</label>
                          <input type="color" id={`section${index}color`} className='border border-white rounded m-1 pl-1' onChange={(e) => {
                            let newSectionName = [...sectionName]
                            newSectionName[index].color = e.target.value
                            setSectionName(newSectionName)
                          }} />
                        </div>

                        <button className='pl-2 pr-2 m-2 block border border-white rounded-2xl bg-red-900 cursor-pointer' onClick={() => {
                          let newSectionName = [...sectionName]
                          newSectionName[index].done = true
                          console.log(displayOnly)
                          if (displayOnly) {
                            let i = 0
                            for (let sec of Object.entries(seatLayout)) {
                              if (sec[0].startsWith('displayOnly')) {
                                const match = sec[0].match(/\d+/);
                                let j;
                                if (match) {
                                  j = parseInt(match[0], 10);
                                }
                                if (j > i) {
                                  i = j
                                }
                              }
                            }
                            newSectionName[index].displayOnly = true
                            newSectionName[index].seatDone = true
                            let Layout = {}
                            Layout[`displayOnly${parseInt(i) + 1}`] = {
                              name: sectionName[index].text ?? '',
                              price: sectionName[index].price ?? '',
                              textX: sectionName[index].x ?? '',
                              textY: sectionName[index].y ?? '',
                              textAngle: sectionName[index].rotate ?? 0,
                              textFont: sectionName[index].font ?? 10,
                              color: sectionName[index].color ?? 'pink',
                              seats: {},
                              points: {}
                            }

                            let d = `M${polygonPoints[index][0].x} ${polygonPoints[index][0].y}`

                            polygonPoints[index].forEach((ele, idx) => {

                              if (ele.figure === 'arc') {
                                let combined = { ...ele, ...polyarc[index][idx] }
                                Layout[`displayOnly${parseInt(i) + 1}`].points[`point${idx + 1}`] = combined
                                if (idx != 0) d += ` A${combined.radius ?? 100} ${combined.radius ?? 100} 0 ${combined.remaining ?? 0} ${combined.inverted ?? 0} ${combined.x} ${combined.y}`
                              } else {
                                Layout[`displayOnly${parseInt(i) + 1}`].points[`point${idx + 1}`] = ele
                                if (idx != 0) d += ` L${ele.x} ${ele.y}`
                              }
                            });
                            if (polygonPoints[index][0].figure === 'arc') d += ` A${polygonPoints[index][0].radius ?? 100} ${polygonPoints[index][0].radius ?? 100} 0 ${polygonPoints[index][0].remaining ?? 0} ${polygonPoints[index][0].inverted ?? 0} ${polygonPoints[index][0].x} ${polygonPoints[index][0].y}`
                            else { d += ' Z' }
                            Layout[`displayOnly${parseInt(i) + 1}`].d = d
                            setseatLayout({ ...seatLayout, ...Layout })

                            newSectionName.splice(index, 1)
                            let newPolyPoints = [...polygonPoints]
                            newPolyPoints.splice(index, 1)
                            setpolygonPoints(newPolyPoints)
                          }
                          setSectionName(newSectionName)
                        }}>Done</button>
                      </div>)
                    }

                  </div>
                )
              }
            })}

            {Object.entries(seatLayout).map(([key, element]) => {
              return (
                <div key={key} className='border border-[#787877] rounded mt-1'>
                  <div className='p-1 flex justify-between rounded'>
                    <span className='underline cursor-pointer' onClick={() => {

                      if (clickedSection !== key) {
                        setClickedSection(key)
                      } else {
                        setClickedSection('')
                      }
                    }}
                    >{!key.startsWith('display') > 0 ? `Section-${element.name}` : "Reference Section"}</span>

                    <span className='flex gap-2'>
                      {(!key.startsWith('displayOnly') && !editingSections.includes(key)) &&
                        (<button className='border rounded-2xl pl-2 pr-2 bg-[#1f559b] cursor-pointer' onClick={() => {
                          setEditingSections([...editingSections, key])
                        }}>Edit Section</button>)}

                      <button className='pr-1 pl-1 bg-[#7f1313] rounded cursor-pointer' onClick={() => {
                        let newLayout = { ...seatLayout }
                        delete newLayout[key]
                        setseatLayout(newLayout)
                      }}>Delete Section</button>
                    </span>

                  </div>
                  {(editingSections.includes(key) && !editingSectionSeat.includes(key)) &&
                    (
                      <Fragment>
                        {Object.entries(seatLayout[key].points).map(([point_key, point], idx) => {
                          let j = 0
                          for (let i = 0; i <= idx; i++) {

                            if (Object.entries(seatLayout[key].points)[i][1].figure === 'arc') { j++ }
                          }
                          if (point.figure === 'arc') {
                            return (
                              <div key={`${idx}`} className="polyarc flex m-auto p-1">
                                <label htmlFor={`radius:${idx}`}>{`Radius: Arc-${j} `}</label>
                                <input type="number" id={`radius:${idx}}`} min={1} max={1000} className='border border-amber-100 ml-0.5 rounded pl-0.5' defaultValue={point.radius} onChange={(e) => {
                                  let new_polyPoints = { ...seatLayout }
                                  new_polyPoints[key].points[point_key].radius = e.target.value

                                  let d = `M${new_polyPoints[key].points.point1.x} ${new_polyPoints[key].points.point1.y}`

                                  Object.entries(new_polyPoints[key].points).map(([index, ele]) => {

                                    if (ele.figure === 'arc') {
                                      if (index != 'point1') d += ` A${ele.radius ?? 100} ${ele.radius ?? 100} 0 ${ele.remaining ?? 0} ${ele.inverted ?? 0} ${ele.x} ${ele.y}`
                                    } else {
                                      if (index != 'point1') d += ` L${ele.x} ${ele.y}`
                                    }
                                  });
                                  if (new_polyPoints[key].points.point1.figure === 'arc') d += ` A${new_polyPoints[key].points.point1.radius ?? 100} ${new_polyPoints[key].points.point1.radius ?? 100} 0 ${new_polyPoints[key].points.point1.remaining ?? 0} ${new_polyPoints[key].points.point1.inverted ?? 0} ${new_polyPoints[key].points.point1.x} ${new_polyPoints[key].points.point1.y}`
                                  else { d += ' Z' }

                                  new_polyPoints[key].d = d
                                  setseatLayout(new_polyPoints)
                                }} />
                                <label htmlFor={`inverted${idx}`} className='ml-2 mr-1'>{`Inverted arc`}</label>
                                <input type="checkbox" id={`inverted${idx}`} defaultChecked={Boolean(point.inverted)} onChange={(e) => {
                                  let new_polyPoints = { ...seatLayout }
                                  new_polyPoints[key].points[point_key].inverted = e.target.checked ? 1 : 0

                                  let d = `M${new_polyPoints[key].points.point1.x} ${new_polyPoints[key].points.point1.y}`

                                  Object.entries(new_polyPoints[key].points).map(([index, ele]) => {

                                    if (ele.figure === 'arc') {
                                      if (index != 'point1') d += ` A${ele.radius ?? 100} ${ele.radius ?? 100} 0 ${ele.remaining ?? 0} ${ele.inverted ?? 0} ${ele.x} ${ele.y}`
                                    } else {
                                      if (index != 'point1') d += ` L${ele.x} ${ele.y}`
                                    }
                                  });
                                  if (new_polyPoints[key].points.point1.figure === 'arc') d += ` A${new_polyPoints[key].points.point1.radius ?? 100} ${new_polyPoints[key].points.point1.radius ?? 100} 0 ${new_polyPoints[key].points.point1.remaining ?? 0} ${new_polyPoints[key].points.point1.inverted ?? 0} ${new_polyPoints[key].points.point1.x} ${new_polyPoints[key].points.point1.y}`
                                  else { d += ' Z' }

                                  new_polyPoints[key].d = d
                                  setseatLayout(new_polyPoints)
                                }} />
                                <label htmlFor={`remaining${idx}`} className='ml-2 mr-1'>{`Remaining arc`}</label>
                                <input type="checkbox" id={`remaining${idx}`} defaultValue={Boolean(point.remaining)} onChange={(e) => {
                                  let new_polyPoints = { ...seatLayout }
                                  new_polyPoints[key].points[point_key].remaining = e.target.checked ? 1 : 0

                                  let d = `M${new_polyPoints[key].points.point1.x} ${new_polyPoints[key].points.point1.y}`

                                  Object.entries(new_polyPoints[key].points).map(([index, ele]) => {

                                    if (ele.figure === 'arc') {
                                      if (index != 'point1') d += ` A${ele.radius ?? 100} ${ele.radius ?? 100} 0 ${ele.remaining ?? 0} ${ele.inverted ?? 0} ${ele.x} ${ele.y}`
                                    } else {
                                      if (index != 'point1') d += ` L${ele.x} ${ele.y}`
                                    }
                                  });
                                  if (new_polyPoints[key].points.point1.figure === 'arc') d += ` A${new_polyPoints[key].points.point1.radius ?? 100} ${new_polyPoints[key].points.point1.radius ?? 100} 0 ${new_polyPoints[key].points.point1.remaining ?? 0} ${new_polyPoints[key].points.point1.inverted ?? 0} ${new_polyPoints[key].points.point1.x} ${new_polyPoints[key].points.point1.y}`
                                  else { d += ' Z' }

                                  new_polyPoints[key].d = d
                                  setseatLayout(new_polyPoints)
                                }} />
                              </div>
                            )
                          }
                        })}
                        <div className='m-1'>
                          <label htmlFor='sectionName'>Enter Section Name</label>
                          <input type="text" id='sectionName' ref={(el) => { sectionNameInput.current[key] = el }} defaultValue={element.name} className='border border-white rounded ml-1 pl-1' />

                          <button className="cursor-pointer border border-white bg-amber-300 text-white pl-2 pr-2 rounded m-1" onClick={() => {
                            let layout = { ...seatLayout }
                            layout[key].name = sectionNameInput.current[key].value
                            setseatLayout(layout)
                            console.log(element)
                          }}>Set</button>

                        </div>

                        <div className=' m-1'>
                          <Fragment>
                            <label htmlFor={`section${key}x`}>X-Dist</label>
                            <input type="number" min={0} max={800} value={element.textX} onWheel={(e) => { e.stopPropagation() }} className='m-1 border border-white rounded' id={`section${key}x`} onChange={(e) => {
                              let layout = { ...seatLayout }
                              layout[key].textX = Number(e.target.value)
                              setseatLayout(layout)
                            }} />

                            <label htmlFor={`section${key}y`}>Y-Dist</label>
                            <input type="number" min={0} max={800} value={element.textY} className='m-1 border border-white rounded' id={`section${key}y`} onChange={(e) => {
                              let layout = { ...seatLayout }
                              layout[key].textY = Number(e.target.value)
                              setseatLayout(layout)
                            }} />

                            <label htmlFor={`section${key}rotate`}>Angle</label>
                            <input type="number" min={-180} max={180} value={element.textAngle} className='m-1 border border-white rounded' id={`section${key}rotate`} onChange={(e) => {
                              let layout = { ...seatLayout }
                              layout[key].textAngle = Number(e.target.value)
                              setseatLayout(layout)
                            }} />

                            <label htmlFor={`section${key}font`}>Font</label>
                            <input type="number" min={1} max={30} value={element.textFont} className='m-1 border border-white rounded' id={`section${key}font`} onChange={(e) => {
                              let layout = { ...seatLayout }
                              layout[key].textFont = Number(e.target.value)
                              setseatLayout(layout)
                            }} />
                          </Fragment>

                          {element.price && (
                            <div>
                              <label htmlFor={`section${key}price`}>Enter Section Price (₹)</label>
                              <input type="number" min={0} id={`section${key}price`} defaultValue={Number(element.price)} onChange={(e) => {
                                let layout = { ...seatLayout }
                                layout[key].price = (e.target.value)
                                setseatLayout(layout)
                              }} className='border border-white rounded m-1 pl-1' />
                            </div>
                          )}

                          <div>
                            <label htmlFor={`section${key}color`}>Enter Section Color</label>
                            <input type="color" id={`section${key}color`} value={element.color} className='border border-white rounded m-1 pl-1' onChange={(e) => {
                              let layout = { ...seatLayout }
                              layout[key].color = (e.target.value)
                              setseatLayout(layout)
                            }} />
                          </div>

                          <div className='flex'>
                            <button className='pl-2 pr-2 m-2 block border border-white rounded-2xl bg-red-900 cursor-pointer' onClick={() => {
                              let index = editingSections.indexOf(key);
                              let newEditingSections = [...editingSections]
                              newEditingSections.splice(index, 1)
                              setEditingSections(newEditingSections)
                            }}>Done</button>

                            <button className='border rounded-2xl pl-2 pr-2 m-2 bg-[#1f559b] cursor-pointer' onClick={() => {
                              setEditingSectionSeat([...editingSectionSeat, key])
                            }}>Edit Seats</button>
                          </div>
                        </div>

                      </Fragment>
                    )
                  }

                  {editingSectionSeat.includes(key) && (
                    <div>
                      <div className="flex">
                        <label htmlFor={`row${key}`} className='m-1'>Number of rows</label>
                        <input type="number" min={1} max={100} defaultValue={1} onWheel={(e) => { e.preventDefault() }} className='border border-white rounded m-1 pl-1' id={`row${key}`} ref={(el) => { seatLayoutRows.current[key] = el }} />
                      </div>

                      <div className="flex">
                        <label htmlFor={`rowNumber${key}`} className='m-1'>Seats in each row</label>
                        <input type="number" min={1} max={100} id={`rowNumber${key}`} defaultValue={1} className='border border-white rounded m-1 pl-1' ref={(el) => { seatLayoutCols.current[key] = el }} />
                      </div>

                      <div className="flex">
                        <label htmlFor="layoutType" className='m-1'>Seats Layout Type</label>
                        <select name="layoutType" id="layoutType" className='border border-white rounded m-1 cursor-pointer' ref={(el) => { seatLayoutType.current[key] = el }}>
                          <option value="linear">Linear</option>
                          <option value="arc">Arc</option>
                          <option value="arcFixed">Arc With Fixed Seats</option>
                        </select>
                      </div>

                      <button className='m-2 pl-2 pr-2 bg-green-900 border border-white rounded-2xl cursor-pointer' onClick={() => {
                        let layout_idx = 0;
                        let seat_idx = 0

                        for (let layout of Object.entries(seatLayout[key].seats)) {
                          const match = layout[0].match(/\d+/);
                          let j;
                          if (match) {
                            j = parseInt(match[0], 10);
                          }
                          seat_idx++;
                          if (j > layout_idx) layout_idx = j
                        }


                        let newSeatLayout = { ...seatLayout }
                        newSeatLayout[key].seats[`layout${layout_idx + 1}`] = ({
                          rows: parseInt(seatLayoutRows.current[key].value),
                          columns: parseInt(seatLayoutCols.current[key].value),
                          type: (seatLayoutType.current[key].value),
                          seat_data: {},
                          rowGap: 5,
                          colGap: 5,
                          layoutRadius: 500,
                          seatRadius: 1,
                          angle: 0,
                          groupX: seatLayout[key].points.point1.x,
                          groupY: seatLayout[key].points.point1.y,
                          deletedSeats: []
                        })

                        let layout_key = `layout${layout_idx + 1}`
                        layoutGenerate(layout_key, key, newSeatLayout)
                        setseatLayout(newSeatLayout)
                        alert("Press CTRL or SHIFT and then click on seat to delete")
                      }} >Generate Seat Layout</button>

                      {Object.entries(seatLayout[key].seats).length > 0 && (
                        <Fragment>
                          <div className='grid grid-cols-2 justify-items-center w-125'>
                            {
                              Object.entries(seatLayout[key].seats).map(([layout_key, layout]) => {

                                const match = layout_key.match(/\d+/);
                                let idx;
                                if (match) {
                                  idx = parseInt(match[0], 10);
                                }
                                return (
                                  <div key={layout_key} className=' m-1 rounded w-fit p-1 bg-[#ffffff12] flex flex-col justify-around border'>
                                    <div className='w-fit underline m-1 mt-0'>{`Seat Layout - ${idx}`}</div>
                                    <div className='w-fit'>
                                      <label htmlFor={`seatRadius${layout_key}`} className='m-1'>Seat Radius</label>
                                      <input type="number" min={0.1} max={50} defaultValue={layout.seatRadius} step={0.1} className='border border-white rounded m-1 pl-1' id={`seatRadius${layout_key}`} onChange={(e) => {
                                        let newSectionName = { ...seatLayout }
                                        newSectionName[key].seats[layout_key].seatRadius = Number(e.target.value)
                                        layoutGenerate(layout_key, key, newSectionName)
                                        setseatLayout(newSectionName)
                                      }} />
                                    </div>

                                    <div className='w-fit'>
                                      <label htmlFor={`rowGap${layout_key}`} className='m-1'>Row Gap</label>
                                      <input type="number" min={0.1} max={50} step={0.1} defaultValue={layout.rowGap} className='border border-white rounded m-1 pl-1' id={`rowGap${layout_key}`} onChange={(e) => {
                                        let newSectionName = { ...seatLayout }
                                        newSectionName[key].seats[layout_key].rowGap = Number(e.target.value)
                                        layoutGenerate(layout_key, key, newSectionName)
                                        setseatLayout(newSectionName)
                                      }} />
                                    </div>

                                    <div className='w-fit'>
                                      <label htmlFor={`colGap${layout_key}`} className='m-1'>Column Gap</label>
                                      <input type="number" min={0.1} max={50} step={0.1} defaultValue={layout.colGap} className='border border-white rounded m-1 pl-1' id={`colGap${layout_key}`} onChange={(e) => {
                                        let newSectionName = { ...seatLayout }
                                        newSectionName[key].seats[layout_key].colGap = Number(e.target.value)
                                        layoutGenerate(layout_key, key, newSectionName)
                                        setseatLayout(newSectionName)
                                      }} />
                                    </div>

                                    <div className='w-fit'>
                                      <label htmlFor={`seatLayoutAngle${layout_key}`} className='m-1'>Layout Angle</label>
                                      <input type="number" min={-180} max={180} defaultValue={layout.angle} className='border border-white rounded m-1 pl-1' id={`seatLayoutAngle${layout_key}`} onChange={(e) => {
                                        let newSectionName = { ...seatLayout }
                                        newSectionName[key].seats[layout_key].angle = Number(e.target.value)
                                        setseatLayout(newSectionName)
                                      }} />
                                    </div>

                                    <div className='w-fit'>
                                      <label htmlFor={`groupX${layout_key}`} className='m-1'>Layout X-dist</label>
                                      <input type="number" min={0} max={800} value={layout.groupX} className='border border-white rounded m-1 pl-1' id={`groupX${layout_key}`} onChange={(e) => {
                                        let newSectionName = { ...seatLayout }
                                        newSectionName[key].seats[layout_key].groupX = Number(e.target.value)
                                        setseatLayout(newSectionName)
                                      }} />
                                    </div>

                                    <div className='w-fit'>
                                      <label htmlFor={`groupY${layout_key}`} className='m-1'>Layout Y-dist</label>
                                      <input type="number" min={0} max={800} value={layout.groupY} className='border border-white rounded m-1 pl-1' id={`groupY${layout_key}`} onChange={(e) => {
                                        let newSectionName = { ...seatLayout }
                                        newSectionName[key].seats[layout_key].groupY = Number(e.target.value)
                                        setseatLayout(newSectionName)
                                      }} />
                                    </div>

                                    {(layout.type === 'arc' || layout.type === 'arcFixed') && (
                                      <div className='w-fit'>
                                        <label htmlFor={`layoutRadius${layout_key}`} className='m-1'>Arc Radius</label>
                                        <input type="number" min={1} max={1000} defaultValue={layout.layoutRadius} className='border border-white rounded m-1 pl-1' id={`layoutRadius${layout_key}`} onChange={(e) => {
                                          let newSectionName = { ...seatLayout }
                                          newSectionName[key].seats[layout_key].layoutRadius = Number(e.target.value)
                                          layoutGenerate(layout_key, key, newSectionName)
                                          setseatLayout(newSectionName)
                                        }} />
                                      </div>
                                    )}
                                    <button className=' bg-[#7f1313] rounded pl-1 pr-1 m-1 cursor-pointer' onClick={() => {
                                      let newSectionName = { ...seatLayout }
                                      delete newSectionName[key].seats[layout_key]
                                      console.log(newSectionName)
                                      setseatLayout(newSectionName)
                                      setEditingSeat(null)
                                      setSelectDeleteSeats([])
                                    }}>Delete Layout</button>

                                  </div>

                                )
                              })
                            }
                          </div>

                          {(editingSeat && editingSeat?.sectionKey === key) && (

                            <div className="m-2 w-fit border rounded p-1" key={JSON.stringify(editingSeat)}>
                              <h3 className='m-1 ml-0 w-fit underline'>Edit Seat Details</h3>
                              <div className='ml-1 w-fit'>Layout Index:</div>

                              <div className='w-fit'>
                                <label className='m-1'>Seat Name:</label>
                                <input type="text" placeholder="e.g. AB-12" className='border m-1 border-white rounded pl-1' defaultValue={seatLayout[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatName} ref={(el) => { seatNameRef.current[key] = el }} />
                              </div>

                              <div className='w-fit'>
                                <label className='ml-1'>Price (₹):</label>
                                <input type="number" min={0} placeholder="e.g. 150" className='border border-white rounded ml-1 pl-1' defaultValue={seatLayout[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatPrice} ref={(el) => { seatPriceRef.current[key] = el }} />
                              </div>

                              <div className='w-fit'>
                                <label className='m-1'>Tier Category:</label>
                                <select className='border m-1 border-white rounded' defaultValue={seatLayout[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatTier} ref={(el) => { seatTierRef.current[key] = el }}>
                                  <option value="none">None</option>
                                  <option value="vip">VIP</option>
                                  <option value="premium">Premium</option>
                                  <option value="standard">Standard</option>
                                </select>
                              </div>


                              <button onClick={() => {
                                let newSectionName = { ...seatLayout }
                                let seatName = seatNameRef.current[key]?.value.trim() || newSectionName[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatName
                                let seatPrice = seatPriceRef.current[key]?.value.trim() || newSectionName[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatPrice
                                let seatTier = seatTierRef.current[key]?.value.trim() || newSectionName[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatTier
                                newSectionName[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatName = seatName
                                newSectionName[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatPrice = seatPrice
                                newSectionName[key].seats[editingSeat.layoutKey].seat_data[editingSeat.seatKey].seatTier = seatTier
                                setseatLayout(newSectionName)
                                // let newDoneseats = [...doneSeats, editingSeat.seatKey]
                                // setDoneSeats(newDoneseats)
                                setEditingSeat(null)
                              }} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-green-900'>Save Details</button>

                              <button onClick={() => {
                                setEditingSeat(null)
                              }} className='border m-1 border-white rounded pl-1 pr-1 cursor-pointer bg-[#765817]'>Cancel</button>
                            </div>
                          )}
                          {selectDeleteSeat.length > 0 && (
                            <Fragment>
                              <span className='m-1'>{selectDeleteSeat.length} seats selected</span>
                              <button onClick={() => {
                                let newSeatLayout = { ...seatLayout }
                                for (let seat of selectDeleteSeat) {
                                  if (!newSeatLayout[key].seats[seat.layoutKey].deletedSeats) {
                                    newSeatLayout[key].seats[seat.layoutKey].deletedSeats = []
                                  }
                                  newSeatLayout[key].seats[seat.layoutKey].deletedSeats.push(seat.seatKey)
                                }
                                setseatLayout(newSeatLayout)
                                setSelectDeleteSeat([])
                              }} className='rounded bg-[#7f1313] pl-1 pr-1 cursor-pointer'>
                                Delete Selected Seats
                              </button>
                            </Fragment>
                          )}

                          <button className='pl-2 pr-2 m-2 block border border-white rounded-2xl bg-red-900 cursor-pointer' onClick={() => {
                            let index = editingSections.indexOf(key);
                            let newEditingSections = [...editingSections]
                            newEditingSections.splice(index, 1)
                            setEditingSections(newEditingSections)

                            index = editingSectionSeat.indexOf(key);
                            let newEditingSectionSeat = [...editingSectionSeat]
                            newEditingSectionSeat.splice(index, 1)
                            setEditingSectionSeat(newEditingSectionSeat)
                          }}>Done</button>

                        </Fragment>
                      )}
                    </div>
                  )
                  }
                </div>
              )
            })}
          </div>

        </div>

        <div className="seat_canvas mb-auto ml-auto mr-auto mt-2 overflow-hidden border-2 border-amber-500 w-[800px]" onContextMenu={(e) => { e.preventDefault() }}>
          <svg ref={sceneRef} id="svg_canvas" className='cursor-pointer border border-white opacity-50 p-0 mb-auto ml-auto mr-auto' viewBox='0 0 800 800' onMouseDown={handleGridMouseDown} onMouseMove={handleGridMouseMove} onMouseUp={handleGridMouseUp} >
            <g>
              <image href={Image} x={0} y={0} width='100%' height='100%' pointerEvents='none'></image>
              <g>
                {Array.from({ length: rows - 1 }, (element, index) => {
                  return (
                    <path key={`row:${index}`} d={`M0 ${(index + 1) * 800 / rows} H800`} stroke='white' strokeOpacity={0.5} strokeWidth={0.5} fill='none' pointerEvents='none'></path>
                  )
                })}
                {Array.from({ length: columns - 1 }, (element, index) => {
                  return (
                    <path key={`col:${index}`} d={`M${(index + 1) * 800 / columns} 0 V800`} stroke='white' strokeOpacity={0.5} strokeWidth={0.5} fill='none' pointerEvents='none'></path>
                  )
                })}
              </g>

              <g fill="none">
                {arcPoints.map((element, index) => {
                  if (((index + 2) <= arcPoints.length && index % 2 === 0) && arcPoints.length > 0) {
                    return (
                      <path key={index} d={`M${arcPoints[(index)][0]} ${arcPoints[(index)][1]} A${radius[index / 2]} ${radius[index / 2]} 0 ${remaining[index / 2]} ${inverted[index / 2]} ${arcPoints[1 + index][0]} ${arcPoints[1 + index][1]}`} stroke='red' strokeWidth={0.2} pointerEvents='none'></path>
                    )
                  }
                })}
              </g>
              <g>
                {linePoints.map((element, index) => {
                  if (((index + 2) <= linePoints.length && index % 2 === 0) && linePoints.length > 0) {
                    return (
                      <path key={index} d={`M${linePoints[(index)][0]} ${linePoints[(index)][1]} L${linePoints[1 + index][0]} ${linePoints[1 + index][1]}`} stroke='red' strokeWidth={0.5} pointerEvents='none'></path>
                    )
                  }
                })}
              </g>
              <g>
                {tempPolygon.map((element, index) => {
                  return (
                    <circle
                      cx={element.x}
                      cy={element.y}
                      r={1}
                      fill={'red'}
                      strokeWidth={0}
                      key={index}
                      pointerEvents={'none'}
                    />
                  )
                })}
              </g>

              <g
                onClick={handleSeatClick}>

                {seatLayout && (
                  Object.entries(seatLayout).map(([section_key, section_val]) => {
                    let d = section_val?.d
                    let rotationAngle = section_val?.textAngle ? section_val.textAngle : 0
                    let text = section_val?.name ? section_val.name : ''
                    let color = section_val?.color ? section_val.color : 'pink'
                    let font = section_val?.textFont ? section_val.textFont : 10
                    let textX = section_val?.textX
                    let textY = section_val?.textY
                    let displayOnly = section_key.startsWith('displayOnly')
                    let radius = !displayOnly ? Object.entries(section_val?.seats)[0][1].seatRadius : 1
                    const scaleThreshold = 4 / radius || 1
                    const opacityThreshold = 2 / radius || 1
                    let isHovered = hoveredSection === section_key
                    let opacity = isHovered ? 0.5 : 0
                    let displayseats = false
                    let stroke = clickedSection === section_key ? 'white' : (editingSections.includes(section_key) ? 'red' : 'none')
                    let strokeWidth = clickedSection === section_key ? '' : '0.2'

                    if (transform.scale > opacityThreshold && !displayOnly) {

                      // Frustum Culling Part (it's just rendening only the seats of the sections that are present near the zoomed part)
                      let x = transform.x * -1 / transform.scale + width / (transform.scale * 2)
                      let y = transform.y * -1 / transform.scale + width / (transform.scale * 2)
                      let threshold = width / transform.scale + width / 10
                      let minX = width
                      let maxX = 0
                      let minY = width
                      let maxY = 0
                      for (let point of Object.values(section_val.points)) {
                        let pointx = (point.x * width) / 800
                        let pointy = (point.y * width) / 800
                        if ((Math.abs(pointx - x) <= threshold) && (Math.abs(pointy - y) <= threshold)) {
                          displayseats = true
                          if (transform.scale > scaleThreshold) {
                            opacity = 1
                          } else {
                            opacity = (transform.scale - opacityThreshold) / (scaleThreshold - opacityThreshold)
                          }
                        }

                        if (pointx > maxX) {
                          maxX = pointx
                        }
                        if (pointy > maxY) {
                          maxY = pointy
                        }
                        if (pointx < minX) {
                          minX = pointx
                        }
                        if (point.y < minY) {
                          minY = pointy
                        }
                      }
                      if ((x > minX && x < maxX) && (y > minY && y < maxY)) {
                        displayseats = true
                        if (transform.scale > scaleThreshold) {
                          opacity = 1
                        } else {
                          opacity = (transform.scale - opacityThreshold) / (scaleThreshold - opacityThreshold)
                        }
                      }
                    }
                    if (editingSectionSeat.includes(section_key)) {
                      opacity = 1
                      displayseats = true
                    }

                    return (
                      <Fragment key={section_key} >
                        <g onClick={(e) => { handleSectionClick(e, textX, textY, scaleThreshold) }} className={!displayOnly ? 'cursor-pointer' : ''} onMouseEnter={() => { setHoveredSection(section_key) }} onMouseLeave={() => { setHoveredSection(null) }} pointerEvents={displayOnly ? 'none' : ''}>
                          <path d={d} stroke={stroke} fill={color} strokeWidth={strokeWidth} fillOpacity={displayOnly ? 0.4 : (1 - opacity + 0.2)} ></path>
                          <text x={textX} y={textY} textAnchor='middle' pointerEvents={'none'} dominantBaseline='central' fontSize={font} transform={`rotate(${rotationAngle},${textX},${textY})`} fill='white' opacity={1 - opacity + 0.2}>{text}</text>
                          {editingSections.includes(section_key) && (
                            <Fragment>
                              {Object.entries(section_val.points).map(([i, e]) => {
                                return (<circle
                                  cx={e.x}
                                  cy={e.y}
                                  r={1.5}
                                  strokeWidth={3}
                                  fillOpacity={0.5}
                                  stroke='transparent'
                                  fill='red'
                                  className='dont-pan'
                                  onMouseDown={(e) => {
                                    seteditClicked(true)
                                  }}
                                  onMouseMove={(e) => {
                                    if (editClicked) {
                                      const svg = sceneRef.current;
                                      const point = svg.createSVGPoint();
                                      point.x = e.clientX;
                                      point.y = e.clientY;
                                      const svgCoords = point.matrixTransform(svg.getScreenCTM().inverse());
                                      let x = svgCoords.x
                                      let y = svgCoords.y
                                      let new_polyPoints = { ...seatLayout }
                                      new_polyPoints[section_key].points[i].x = x
                                      new_polyPoints[section_key].points[i].y = y

                                      let d = `M${new_polyPoints[section_key].points.point1.x} ${section_val.points.point1.y}`

                                      Object.entries(new_polyPoints[section_key].points).map(([idx, ele]) => {

                                        if (ele.figure === 'arc') {
                                          if (idx != 'point1') d += ` A${ele.radius ?? 100} ${ele.radius ?? 100} 0 ${ele.remaining ?? 0} ${ele.inverted ?? 0} ${ele.x} ${ele.y}`
                                        } else {
                                          if (idx != 'point1') d += ` L${ele.x} ${ele.y}`
                                        }
                                      });
                                      if (section_val.points.point1.figure === 'arc') d += ` A${new_polyPoints[section_key].points.point1.radius ?? 100} ${new_polyPoints[section_key].points.point1.radius ?? 100} 0 ${new_polyPoints[section_key].points.point1.remaining ?? 0} ${new_polyPoints[section_key].points.point1.inverted ?? 0} ${new_polyPoints[section_key].points.point1.x} ${new_polyPoints[section_key].points.point1.y}`
                                      else { d += ' Z' }

                                      new_polyPoints[section_key].d = d
                                      setseatLayout(new_polyPoints)
                                    }
                                  }}
                                  onMouseUp={() => {
                                    seteditClicked(false)
                                  }}
                                  key={i}
                                />)
                              })}
                            </Fragment>
                          )}
                        </g>

                        {(displayseats && !displayOnly) && (
                          <Fragment>
                            {Object.entries(section_val?.seats).map(([layout_key, layout_val]) => {
                              let rows = layout_val.rows
                              let columns = layout_val.columns
                              let seatRadius = layout_val.seatRadius || 1
                              let layoutRadius = layout_val.layoutRadius || 100
                              let rowGap = layout_val.rowGap || 10
                              let colGap = layout_val.colGap || 10
                              let type = layout_val.type
                              let colLength = (2 * rows - 1) * seatRadius + (rows - 1) * rowGap + layoutRadius

                              let angle = (seatRadius * (2 * (columns - 1)) + colGap * (columns - 1)) / layoutRadius
                              let sin = Math.sin(angle)
                              let cos = Math.cos(angle)
                              let arcwidth = (colLength - (seatRadius * + rowGap)) * Math.sin((seatRadius * (2 * columns) + colGap * columns) / layoutRadius) + seatRadius
                              let archeight = colLength - (colLength - (seatRadius * (2 * rows + 1) + rowGap * rows)) * Math.cos((seatRadius * (2 * columns) + colGap * columns) / layoutRadius)

                              return (
                                <g
                                  key={layout_key}
                                  transform={`translate(${layout_val.groupX},${layout_val.groupY}) rotate(${layout_val.angle})`}
                                  style={{ cursor: 'pointer' }}
                                  className='dont-pan'
                                  onMouseDown={(e) => {
                                    setLayoutClicked(true)
                                    setCoorDifference({ x: (e.nativeEvent.offsetX - layout_val.groupX), y: (e.nativeEvent.offsetY - layout_val.groupY) })
                                  }}
                                  onMouseMove={(e) => {
                                    console.log('mousemove', layoutClicked)
                                    if (layoutClicked) {
                                      const svg = sceneRef.current;
                                      const point = svg.createSVGPoint();
                                      point.x = e.clientX;
                                      point.y = e.clientY;
                                      const svgCoords = point.matrixTransform(svg.getScreenCTM().inverse());
                                      let x = svgCoords.x - coorDifference.x
                                      let y = svgCoords.y - coorDifference.y
                                      let newSectionName = { ...seatLayout }
                                      newSectionName[section_key].seats[layout_key].groupX = x
                                      newSectionName[section_key].seats[layout_key].groupY = y
                                      setSectionName(newSectionName)
                                    }
                                  }}
                                  onMouseUp={() => {
                                    setLayoutClicked(false)
                                  }}
                                >
                                  <rect x={-1} y={-1} width={type === 'linear' ? ((colGap + 2 * seatRadius) * columns + 5) : arcwidth} height={type === 'linear' ? (rowGap + 2 * seatRadius) * rows + 5 : archeight} fill="transparent" />
                                  {Object.entries(layout_val.seat_data).map(([seat_key, seat_val]) => {

                                    const seatDetail = { seatKey: seat_key, sectionKey: section_key, layoutKey: layout_key }
                                    const isSelected = editingSeat ? (JSON.stringify(editingSeat) === JSON.stringify(seatDetail)) : false
                                    const isHovered = hoveredSeat ? (JSON.stringify(seatDetail) === JSON.stringify(hoveredSeat)) : false
                                    const isDeleting = selectDeleteSeat ? (selectDeleteSeat.some((seat) => (seat.seatKey === seat_key && seat.layoutKey === layout_key && seat.sectionKey === section_key))) : false
                                    const isDone = false
                                    // Setting the seat color according to the user want to edit it or delete
                                    let fillColor
                                    if (isDeleting) {
                                      fillColor = '#ff4d4f'
                                    } else if (isSelected) {
                                      fillColor = '#1DB954'
                                    } else if (isHovered) {
                                      fillColor = '#FFAC1C'
                                    } else {
                                      fillColor = '#1890ff'
                                    }
                                    if (layout_val.deletedSeats?.includes(seat_key)) return null;
                                    return (
                                      <g
                                        key={seat_key}
                                        onMouseEnter={handleSeatHover}
                                        onMouseLeave={() => { setHoveredSeat(null) }}
                                      >
                                        <circle
                                          cx={seat_val.x}
                                          cy={seat_val.y}
                                          r={layout_val.seatRadius}
                                          fill={fillColor}
                                          strokeWidth={0}
                                          opacity={opacity}
                                          data-key={JSON.stringify(seatDetail)}
                                          key={seat_key}
                                        />
                                      </g>
                                    )
                                  })}
                                </g>
                              )
                            })}
                          </Fragment>
                        )
                        }
                      </Fragment>
                    )
                  })
                )}
              </g>


              <g>
                {polygonPoints.map((element, index) => {
                  if (polygonPoints.length > 0) {
                    let d = `M${element[0]['x']} ${element[0]['y']} `
                    let displayOnly = sectionName[index]?.displayOnly || false
                    for (let i = 1; i < polysides[index]; i++) {
                      let radius = polyarc[index][i]?.radius ? polyarc[index][i].radius : 100
                      let remaining = polyarc[index][i]?.remaining ? polyarc[index][i].remaining : 0
                      let inverted = polyarc[index][i]?.inverted ? polyarc[index][i].inverted : 0
                      if (element[i].figure === 'line') {
                        d += `L${element[i]['x']} ${element[i]['y']} `
                      } else {
                        d += `A${radius} ${radius} 0 ${remaining} ${inverted} ${element[i]['x']} ${element[i]['y']} `
                      }
                    }
                    let rotationAngle = sectionName[index]?.rotate ? sectionName[index].rotate : 0
                    let text = sectionName[index]?.text ? sectionName[index].text : ''
                    let font = sectionName[index]?.font ? sectionName[index].font : 10
                    let textX = sectionName[index]?.x ? sectionName[index].x : element[0].x
                    let textY = sectionName[index]?.y ? sectionName[index].y : element[0].y
                    let color = sectionName[index]?.color ? sectionName[index].color : 'pink'
                    let stroke = clickedSection === `index${index}` ? 'white' : 'red'
                    let strokeWidth = clickedSection === `index${index}` ? 1 : 0.2

                    if (element[0].figure === 'arc') {
                      d += `A${polyarc[index][0].radius} ${polyarc[index][0].radius} 0 ${polyarc[index][0].remaining} ${polyarc[index][0].inverted} ${element[0]['x']} ${element[0]['y']} `
                    }
                    else { d += 'Z' }
                    return (
                      <Fragment key={index} >
                        <g>
                          <path d={d} strokeWidth={strokeWidth} stroke={stroke} fillOpacity={(!sectionName[index] || sectionName[index]?.done) ? 0.5 : 1} fill={color} pointerEvents={displayOnly ? 'none' : ''}></path>
                          <text x={textX} y={textY} textAnchor='middle' pointerEvents={'none'} dominantBaseline='central' fontSize={font} transform={`rotate(${rotationAngle},${textX},${textY})`} fill='white'>{text}</text>
                          {!sectionName[index]?.done && (
                            <Fragment>
                              {element.map((e, i) => {
                                return (<circle
                                  cx={e.x}
                                  cy={e.y}
                                  r={1.5}
                                  strokeWidth={3}
                                  fillOpacity={0.5}
                                  stroke='transparent'
                                  fill='red'
                                  className='dont-pan'
                                  onMouseDown={(e) => {
                                    seteditClicked(true)
                                  }}
                                  onMouseMove={(e) => {
                                    if (editClicked) {
                                      const svg = sceneRef.current;
                                      const point = svg.createSVGPoint();
                                      point.x = e.clientX;
                                      point.y = e.clientY;
                                      const svgCoords = point.matrixTransform(svg.getScreenCTM().inverse());
                                      let x = svgCoords.x
                                      let y = svgCoords.y
                                      let new_polyPoints = [...polygonPoints]
                                      new_polyPoints[index][i].x = x
                                      new_polyPoints[index][i].y = y
                                      setpolygonPoints(new_polyPoints)
                                    }
                                  }}
                                  onMouseUp={() => {
                                    seteditClicked(false)
                                  }}
                                  key={i}
                                />)
                              })}
                            </Fragment>
                          )}
                        </g>
                        {sectionName[index]?.seats?.length > 0 && (
                          <Fragment>
                            {sectionName[index].seats.map((ele, idx) => {
                              let rows = ele.rows
                              let columns = ele.columns
                              let posX = ele.groupX
                              let posY = ele.groupY
                              let seatRadius = ele.seatRadius || 1
                              let layoutRadius = ele.layoutRadius || 100
                              let rotationAngle = ele.angle || 0
                              let rowGap = ele.rowGap || 10
                              let colGap = ele.colGap || 10
                              let type = ele.type
                              let colLength = (2 * rows - 1) * seatRadius + (rows - 1) * rowGap + layoutRadius

                              let angle = (seatRadius * (2 * (columns - 1)) + colGap * (columns - 1)) / layoutRadius
                              let sin = Math.sin(angle)
                              let cos = Math.cos(angle)
                              let arcwidth = (colLength - (seatRadius * + rowGap)) * Math.sin((seatRadius * (2 * columns) + colGap * columns) / layoutRadius) + seatRadius
                              let archeight = colLength - (colLength - (seatRadius * (2 * rows + 1) + rowGap * rows)) * Math.cos((seatRadius * (2 * columns) + colGap * columns) / layoutRadius)

                              return (
                                <g
                                  key={idx}
                                  transform={`translate(${posX},${posY}) rotate(${rotationAngle})`}
                                  onClick={(e) => { handleSeatClickBefore(e, idx, index); console.log("clicked", e.target.closest("circle")) }} // Delegated click handler passing group index
                                  className='dont-pan'
                                  onMouseDown={(e) => {
                                    setLayoutClicked(true)
                                    setCoorDifference({ x: (e.nativeEvent.offsetX - posX), y: (e.nativeEvent.offsetY - posY) })
                                  }}
                                  onMouseMove={(e) => {
                                    console.log('mousemove', layoutClicked)
                                    if (layoutClicked) {
                                      const svg = sceneRef.current;
                                      const point = svg.createSVGPoint();
                                      point.x = e.clientX;
                                      point.y = e.clientY;
                                      const svgCoords = point.matrixTransform(svg.getScreenCTM().inverse());
                                      let x = svgCoords.x - coorDifference.x
                                      let y = svgCoords.y - coorDifference.y
                                      let newSectionName = [...sectionName]
                                      newSectionName[index].seats[idx].groupX = x
                                      newSectionName[index].seats[idx].groupY = y
                                      setSectionName(newSectionName)
                                    }
                                  }}
                                  onMouseUp={() => {
                                    setLayoutClicked(false)
                                  }}
                                >
                                  {!sectionName[index].seatDone && (
                                    <rect x={-1} y={-1} width={type === 'linear' ? ((colGap + 2 * seatRadius) * columns + 5) : arcwidth} height={type === 'linear' ? (rowGap + 2 * seatRadius) * rows + 5 : archeight} fill="transparent" />
                                  )}
                                  {Array.from({ length: rows }).map((row, row_idx) => {
                                    let arcLength = angle * (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx))
                                    let seats = Math.floor(arcLength / (2 * seatRadius + colGap))
                                    let newcolGap = arcLength / seats - 2 * seatRadius
                                    console.log(index, seats, newcolGap)
                                    return (
                                      <Fragment key={row_idx}>
                                        {Array.from({ length: seats + 1 }).map((col, col_idx) => {
                                          if (type === 'arc') {

                                            let arcangle = (seatRadius * (2 * col_idx) + newcolGap * col_idx) / (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx))
                                            let sin = Math.sin(arcangle)
                                            let cos = Math.cos(arcangle)
                                            let x = (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx)) * sin + seatRadius
                                            let y = colLength - (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx)) * cos

                                            const uniqueSeatKey = `${index}_${idx}_${col_idx}_${row_idx}`;
                                            const isSelected = selectedSeats?.has(uniqueSeatKey);
                                            const isEditing = editingSeat?.seatKey === uniqueSeatKey
                                            console.log(doneSeats)
                                            const isDone = doneSeats.includes(uniqueSeatKey)

                                            // Setting the seat color according to the user want to edit it or delete
                                            let fillColor
                                            if (isSelected) {
                                              fillColor = '#ff4d4f'
                                            } else if (isEditing) {
                                              fillColor = '#1DB954'
                                            } else if (isDone) {
                                              fillColor = '#FFAC1C'
                                            } else {
                                              fillColor = '#1890ff'
                                            }
                                            // Do not render the deleted seats
                                            if (ele.deletedSeats?.includes(`row${row_idx}-col${col_idx}`)) return null;

                                            return (
                                              <circle
                                                cx={x}
                                                cy={y}
                                                r={seatRadius}
                                                fill={fillColor}
                                                strokeWidth={0}
                                                key={`col:${col_idx}-row:${row_idx}`}
                                                data-row={row_idx}
                                                data-col={col_idx}
                                                data-section={sectionName[index].text}
                                              />
                                            )

                                          }
                                        })}
                                      </Fragment>
                                    )
                                  })}
                                  {Array.from({ length: columns }).map((col, col_idx) => {
                                    return (
                                      <Fragment key={`col${col_idx}`}>
                                        {Array.from({ length: rows }).map((row, row_idx) => {
                                          // Unique signature identifier for this specific seat item
                                          const uniqueSeatKey = `${index}_${idx}_${col_idx}_${row_idx}`;
                                          const isSelected = selectedSeats?.has(uniqueSeatKey);
                                          const isEditing = editingSeat?.seatKey === uniqueSeatKey
                                          const isDone = doneSeats.includes(uniqueSeatKey)

                                          // Setting the seat color according to the user want to edit it or delete
                                          let fillColor
                                          if (isSelected) {
                                            fillColor = '#ff4d4f'
                                          } else if (isEditing) {
                                            fillColor = '#1DB954'
                                          } else if (isDone) {
                                            fillColor = '#FFAC1C'
                                          } else {
                                            fillColor = '#1890ff'
                                          }

                                          // Skip rendering completely if this seat metadata was deleted in backend/state
                                          if (ele.deletedSeats?.includes(`row${row_idx}-col${col_idx}`)) return null;

                                          if (type === 'linear') {
                                            let x = seatRadius * (2 * col_idx + 1) + colGap * col_idx
                                            let y = seatRadius * (2 * row_idx + 1) + rowGap * row_idx

                                            return (
                                              <circle
                                                cx={x}
                                                cy={y}
                                                r={seatRadius}
                                                fill={fillColor}
                                                strokeWidth={0}
                                                key={`row${row_idx}`}
                                                data-row={row_idx}
                                                data-col={col_idx}
                                                data-section={sectionName[index].text}
                                              />
                                            )
                                          } else if (type === 'arcFixed') {
                                            let angle = (seatRadius * (2 * col_idx) + colGap * col_idx) / layoutRadius
                                            let sin = Math.sin(angle)
                                            let cos = Math.cos(angle)
                                            let x = (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx)) * sin + seatRadius
                                            let y = colLength - (colLength - (seatRadius * (2 * row_idx + 1) + rowGap * row_idx)) * cos

                                            return (
                                              <circle
                                                cx={x}
                                                cy={y}
                                                r={seatRadius}
                                                fill={fillColor}
                                                strokeWidth={0}
                                                key={row_idx}
                                                data-row={row_idx}
                                                data-col={col_idx}
                                                data-section={sectionName[index].text}
                                              />
                                            )

                                          }
                                        })}
                                      </Fragment>
                                    )
                                  })}
                                </g>
                              )
                            })}
                          </Fragment>
                        )}
                      </Fragment>
                    )
                  }
                })}

              </g>


            </g>
          </svg>
        </div>

        <div className='w-[50px]'>
          <Link to='/' className={`border border-white bg-[#2c662c] pl-1 pr-1 rounded cursor-pointer ${Object.entries(seatLayout).length === 0 ? 'hidden' : ''}`} onClick={saveSeatLayout}>Save</Link>
        </div>

      </div >
    </>
  )
}

export default LayoutCreate