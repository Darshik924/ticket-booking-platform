import React from 'react'
import { NavLink } from 'react-router-dom'

function Home() {
  return (
    <>
      {/* <nav className='flex gap-2 p-1 bg-[#1c273e]'>
        <div className=' rounded m-2 pl-1 pr-1 w-fit cursor-pointer bg-[#306844]'>
          <NavLink to="/event/add" className={({isActive})=>`${isActive ? 'text-[#c8bc76]' : 'text-white'}`}>Add Event</NavLink>
        </div>

        <div className=' rounded m-2 pl-1 pr-1 w-fit cursor-pointer bg-[#306844]'>
          <NavLink to="/list/event" className={({isActive})=>`${isActive ? 'text-[#c8bc76]' : 'text-white'}`}>Edit Event</NavLink>
        </div>

        <div className=' rounded m-2 pl-1 pr-1 w-fit cursor-pointer bg-[#306844]'>
          <NavLink to="/venue/add" className={({isActive})=>`${isActive ? 'text-[#c8bc76]' : 'text-white'}`}>Add Venue</NavLink>
        </div>

        <div className='rounded m-2 pl-1 pr-1 w-fit cursor-pointer bg-[#306844]'>
          <NavLink to="/list/venue" className={({isActive})=>`${isActive ? 'text-[#c8bc76]' : 'text-white'}`}>Edit Venue</NavLink>
        </div>
      </nav> */}
    </>
  )
}

export default Home
