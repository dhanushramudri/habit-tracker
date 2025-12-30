import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import HabitTracker2026 from './components/HabitTracker2026'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <HabitTracker2026/>

    </>
  )
}

export default App
