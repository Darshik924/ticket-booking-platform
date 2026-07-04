import React from 'react'
import { Outlet } from 'react-router-dom'
import Home from './components/Home/Home'

function Layout() {
  return (
    <>
      <Home />
      <Outlet />
    </>
  )
}

export default Layout
