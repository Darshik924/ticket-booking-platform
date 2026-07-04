import { StrictMode, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LayoutCreate from './components/LayoutCreate/LayoutCreate.jsx'
import Event from './components/Event/Event.jsx'
import Venue from './components/Venue/Venue.jsx'
import SeatingLayoutMaker from './components/Sections.jsx'
import Home from './components/Home/Home.jsx'
import Layout from './Layout.jsx'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import List from './components/List/List.jsx'
import LayoutDisplay from './components/LayoutDisplay/LayoutDisplay.jsx'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<Layout />} >
      <Route path='event/:type' element={<Event />} />
      <Route path='seatLayout' element={<LayoutCreate />} />
      <Route path='venue/:type' element={<Venue />} />
      <Route path='list/:type' element={<List />} />
      <Route path='layoutDisplay' element={<LayoutDisplay />} />
    </Route>
  )
)

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
)
